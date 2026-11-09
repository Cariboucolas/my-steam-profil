import type { GameDto, GameTallyDto } from "@steam/contracts";
import { err, ok, type Result } from "@steam/domain";
import { useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { createShortLivedQueryClient, servedFrom } from "../query/FreshQueries";
import type { ApiClient, ApiError, ProgressError } from "./api-client";
import { gamesQuery } from "./games-query";
import { useLibraryTallies } from "./use-library-tallies";

type Tally = Result<GameTallyDto, ProgressError>;
type Games = Result<readonly GameDto[], ApiError>;

const STEAM_ID = "76561197979269357";

/** Dated so that recency order is simply the appIds in ascending order. */
const game = (appId: number): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 100,
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt: `2026-06-${String(20 - appId).padStart(2, "0")}T00:00:00.000Z`,
});

const tally = (unlocked: number): GameTallyDto => ({
  completion: { unlocked, total: 10, percentage: unlocked * 10 },
  unlocks: [],
});

/** Eight games: a count takes two waves. */
const GAMES = [1, 2, 3, 4, 5, 6, 7, 8].map(game);

/** The order the page shows, which a Recount pins the list to. */
const SHOWN_ORDER = [8, 7, 6, 5, 4, 3, 2, 1];

const NO_GAMES: readonly GameDto[] = [];

const refuse = () => {
  throw new Error("a Recount should not have called this");
};

/**
 * A library whose answers the test sets as it goes: `games` and `tally` are
 * read on every ask, and every ask is recorded.
 */
const library = () => {
  const asked = { games: 0, tallies: [] as number[] };
  const answers = {
    games: (): Promise<Games> => Promise.resolve(ok(GAMES)),
    tally: (appId: number): Promise<Tally> => Promise.resolve(ok(tally(appId))),
  };
  const client: ApiClient = {
    getProfile: refuse,
    getGames: () => {
      asked.games += 1;
      return answers.games();
    },
    getGameProgress: refuse,
    getGameTally: (appId) => {
      asked.tallies.push(appId);
      return answers.tally(appId);
    },
    getGameRarity: refuse,
    getAchievementNames: refuse,
  };
  return { client, asked, answers };
};

/** A promise the test settles when it chooses. */
const gate = <T>() => {
  let open: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    open = resolve;
  });
  return { promise, open: (value: T) => act(async () => open(value)) };
};

/** The library as the page holds it: the Games read from the cache, then counted. */
const renderLibrary = (client: ApiClient, cache = createShortLivedQueryClient()) =>
  renderHook(
    () => {
      const games = useQuery(gamesQuery(STEAM_ID, client)).data ?? NO_GAMES;
      return useLibraryTallies(STEAM_ID, client, games);
    },
    { wrapper: servedFrom(cache) },
  );

/** Renders the library and waits for its first count to be through. */
const counted = async (client: ApiClient, cache = createShortLivedQueryClient()) => {
  const rendered = renderLibrary(client, cache);
  await waitFor(() => expect(rendered.result.current.counted).toBe(true));
  return rendered;
};

describe("useLibraryTallies, on a Recount", () => {
  it("asks the list of Games and every tally again", async () => {
    const { client, asked } = library();
    const { result } = await counted(client);
    asked.games = 0;
    asked.tallies = [];

    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(result.current.counted).toBe(true));

    expect(asked.games).toBe(1);
    expect([...asked.tallies].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("asks again a Game whose tally had failed, and shows it once it lands", async () => {
    const { client, answers } = library();
    answers.tally = (appId) => Promise.resolve(appId === 3 ? err("UNAVAILABLE") : ok(tally(appId)));
    const { result } = await counted(client);
    expect(result.current.tallies[3]).toBeUndefined();

    answers.tally = (appId) => Promise.resolve(ok(tally(appId)));
    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(result.current.counted).toBe(true));

    expect(result.current.tallies[3]).toEqual(tally(3));
  });

  it("keeps every figure and the order on screen while the tallies are asked again", async () => {
    const { client, answers } = library();
    const { result } = await counted(client);
    const held = gate<Tally>();
    answers.tally = (appId) => (appId === 8 ? held.promise : Promise.resolve(ok(tally(appId + 1))));

    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(result.current.refreshing).toBe(false));

    expect(result.current.frozenOrder).toEqual(SHOWN_ORDER);
    expect(result.current.tallies[8]).toEqual(tally(8));
    expect(result.current.pending.has(8)).toBe(true);

    await held.open(ok(tally(9)));
    await waitFor(() => expect(result.current.counted).toBe(true));
    expect(result.current.frozenOrder).toBeNull();
    expect(result.current.tallies[8]).toEqual(tally(9));
  });

  it("keeps the figure a Game had when its tally fails during a Recount", async () => {
    const { client, answers } = library();
    const { result } = await counted(client);

    answers.tally = (appId) => Promise.resolve(appId === 5 ? err("UNAVAILABLE") : ok(tally(appId)));
    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(result.current.counted).toBe(true));

    expect(result.current.tallies[5]).toEqual(tally(5));
    expect(result.current.pending.size).toBe(0);
  });

  it("draws a Game new to the list at the bottom, pulsing until its tally lands", async () => {
    const { client, answers, asked } = library();
    const { result } = await counted(client);
    const held = gate<Tally>();
    answers.games = () => Promise.resolve(ok([...GAMES, game(9)]));
    answers.tally = (appId) => (appId === 9 ? held.promise : Promise.resolve(ok(tally(appId))));

    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(asked.tallies).toContain(9));

    expect(result.current.frozenOrder).toEqual([...SHOWN_ORDER, 9]);
    expect(result.current.games.map((g) => g.appId)).toContain(9);
    expect(result.current.pending.has(9)).toBe(true);

    await held.open(ok(tally(9)));
    await waitFor(() => expect(result.current.counted).toBe(true));
    expect(result.current.tallies[9]).toEqual(tally(9));
  });

  it("keeps a Game gone from the list until the Recount ends", async () => {
    const { client, answers } = library();
    const { result } = await counted(client);
    const held = gate<Tally>();
    answers.games = () => Promise.resolve(ok(GAMES.filter((g) => g.appId !== 8)));
    answers.tally = (appId) => (appId === 7 ? held.promise : Promise.resolve(ok(tally(appId))));

    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.games.map((g) => g.appId)).toContain(8);

    await held.open(ok(tally(7)));
    await waitFor(() => expect(result.current.counted).toBe(true));
    expect(result.current.games.map((g) => g.appId)).not.toContain(8);
  });

  it("sends nothing when pulled while the library is still being counted", async () => {
    const { client, answers, asked } = library();
    const held = gate<Tally>();
    answers.tally = (appId) => (appId === 8 ? held.promise : Promise.resolve(ok(tally(appId))));
    const { result } = renderLibrary(client);
    await waitFor(() => expect(asked.tallies).toContain(8));
    const before = { games: asked.games, tallies: asked.tallies.length };

    act(() => result.current.recount(SHOWN_ORDER));

    expect(result.current.refreshing).toBe(false);
    expect({ games: asked.games, tallies: asked.tallies.length }).toEqual(before);
    await held.open(ok(tally(8)));
  });

  it("stops refreshing once the list of Games is back, while tallies are still asked", async () => {
    const { client, answers } = library();
    const { result } = await counted(client);
    const list = gate<Games>();
    const held = gate<Tally>();
    answers.games = () => list.promise;
    answers.tally = (appId) => (appId === 8 ? held.promise : Promise.resolve(ok(tally(appId))));

    act(() => result.current.recount(SHOWN_ORDER));
    expect(result.current.refreshing).toBe(true);

    await list.open(ok(GAMES));
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.pending.has(8)).toBe(true);
    await held.open(ok(tally(8)));
  });

  it("keeps the library and says so when the list of Games fails, until a Recount succeeds", async () => {
    const { client, answers, asked } = library();
    const { result } = await counted(client);
    asked.tallies = [];
    answers.games = () => Promise.resolve(err("PRIVATE_PROFILE"));

    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(result.current.recountFailed).toBe(true));

    expect(result.current.refreshing).toBe(false);
    expect(result.current.counted).toBe(true);
    expect(result.current.tallies[1]).toEqual(tally(1));
    expect(asked.tallies).toEqual([]);

    answers.games = () => Promise.resolve(ok(GAMES));
    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(result.current.recountFailed).toBe(false));
    await waitFor(() => expect(result.current.counted).toBe(true));
  });

  /** A failed list in the cache would put the full error screen up instead. */
  it("leaves the list the page reads loaded when the Recount's list fails", async () => {
    const { client, answers } = library();
    const cache = createShortLivedQueryClient();
    const { result } = await counted(client, cache);
    answers.games = () => Promise.resolve(err("UNAVAILABLE"));

    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(result.current.recountFailed).toBe(true));

    const list = cache.getQueryState(gamesQuery(STEAM_ID, client).queryKey);
    expect(list?.status).toBe("success");
    expect(list?.data).toEqual(GAMES);
  });

  it("never has more than six tallies in flight during a Recount", async () => {
    const { client, answers } = library();
    const { result } = await counted(client);
    let inFlight = 0;
    let highWater = 0;
    answers.tally = async (appId) => {
      inFlight += 1;
      highWater = Math.max(highWater, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return ok(tally(appId));
    };

    act(() => result.current.recount(SHOWN_ORDER));
    await waitFor(() => expect(result.current.counted).toBe(true));

    expect(highWater).toBeGreaterThan(0);
    expect(highWater).toBeLessThanOrEqual(6);
  });
});
