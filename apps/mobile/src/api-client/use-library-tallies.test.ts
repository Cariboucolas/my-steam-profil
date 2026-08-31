import type { GameCompletionDto, GameDto } from "@steam/contracts";
import { err, ok, type Result } from "@steam/domain";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { ApiClient, ProgressError } from "./api-client";
import { useLibraryTallies } from "./use-library-tallies";

type Tally = Result<GameCompletionDto, ProgressError>;

const game = (
  appId: number,
  lastPlayedAt: string | null,
  playtimeMinutes = 100,
): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes,
  playtimeLabel: "1 h 40",
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt,
});

const tally = (unlocked: number): GameCompletionDto => ({
  unlocked,
  total: 10,
  percentage: unlocked * 10,
});

/** Dated so that recency order is simply the appIds in ascending order. */
const playedOn = (appId: number) =>
  `2026-06-${String(20 - appId).padStart(2, "0")}T00:00:00.000Z`;

const libraryOf = (appIds: readonly number[]): readonly GameDto[] =>
  appIds.map((appId) => game(appId, playedOn(appId)));

/**
 * Eight launched games, handed over in no particular order so the recency the
 * hook fetches in is its own doing, plus one never launched. Eight because a
 * load then takes more than one wave, which is what the pinning, the
 * outstanding set and the cancellation all exist for.
 */
const BY_RECENCY = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const NEVER_PLAYED = 99;

const GAMES: readonly GameDto[] = [
  ...libraryOf([3, 7, 1, 8, 4, 2, 6, 5]),
  game(NEVER_PLAYED, null, 0),
];

/** Three waves' worth, so a wave can land after the reader has chosen. */
const LONG_LIBRARY = libraryOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

/** A second library, so a profile switch has something else to land on. */
const OTHER_GAMES: readonly GameDto[] = [game(500, "2026-06-25T00:00:00.000Z")];

/** Only getGameCompletion is exercised; anything else is a bug in the hook. */
const refuse = () => {
  throw new Error("the library should not have called this");
};

const clientAsking = (answer: (appId: number) => Promise<Tally>): ApiClient => ({
  getProfile: refuse,
  getGames: refuse,
  getGameProgress: refuse,
  getGameCompletion: answer,
});

/** Answers every game at once, and records the order it was asked in. */
const eagerClient = () => {
  const asked: number[] = [];
  const client = clientAsking((appId) => {
    asked.push(appId);
    return Promise.resolve(ok(tally(appId)));
  });
  return { client, asked };
};

/**
 * Answers every game except the ones named, which stay in flight until the
 * test releases them — the only way to look at a load while it is still on.
 */
const heldClient = (
  hold: readonly number[],
  answer: (appId: number) => Tally = (appId) => ok(tally(appId)),
) => {
  const gates: Array<() => void> = [];
  const asked: number[] = [];
  const client = clientAsking((appId) => {
    asked.push(appId);
    if (!hold.includes(appId)) {
      return Promise.resolve(answer(appId));
    }
    return new Promise<Tally>((resolve) => {
      gates.push(() => resolve(answer(appId)));
    });
  });
  const release = async () => {
    await act(async () => {
      for (const open of gates.splice(0)) open();
    });
  };
  return { client, asked, release };
};

type Props = {
  readonly client: ApiClient | undefined;
  readonly games: readonly GameDto[];
};

const renderTallies = (
  client: ApiClient | undefined,
  games: readonly GameDto[] = GAMES,
) =>
  renderHook(({ client: c, games: g }: Props) => useLibraryTallies(c, g), {
    initialProps: { client, games },
  });

describe("useLibraryTallies", () => {
  it("counts every game the player has launched", async () => {
    const { client, asked } = eagerClient();
    const { result } = renderTallies(client);

    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect([...asked].sort()).toEqual([...BY_RECENCY]);
    expect(result.current.completions[1]).toEqual(tally(1));
    expect(result.current.completions[8]).toEqual(tally(8));
  });

  /**
   * A game that was never launched cannot hold an unlock, so asking about it
   * buys a guaranteed zero — 100 of the 367 games on the library measured.
   */
  it("spends no request on a game that was never launched", async () => {
    const { client, asked } = eagerClient();
    const { result } = renderTallies(client);

    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect(asked).not.toContain(NEVER_PLAYED);
    expect(result.current.completions[NEVER_PLAYED]).toBeUndefined();
  });

  /**
   * Recency is the order the player recognises, so the list fills from the top
   * with the games they came to look at rather than popping in at random.
   */
  it("asks about the most recently played first", async () => {
    const { client, asked } = eagerClient();
    const { result } = renderTallies(client);

    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect(asked).toEqual([...BY_RECENCY]);
  });

  /**
   * The whole point of loading in waves: the list fills in as answers land,
   * rather than staying blank until the last of several hundred comes back.
   */
  it("hands over each wave as it lands, not everything at the end", async () => {
    const { client, release } = heldClient([7, 8]);
    const { result } = renderTallies(client);

    await waitFor(() => expect(Object.keys(result.current.completions)).toHaveLength(6));
    expect(result.current.pending).toEqual(new Set([7, 8]));

    await release();

    await waitFor(() => expect(result.current.pending.size).toBe(0));
    expect(Object.keys(result.current.completions)).toHaveLength(8);
  });

  /**
   * Six is what a client will open to one host anyway, so a larger number
   * would only queue somewhere less visible.
   */
  it("never has more requests in flight than a client would open", async () => {
    let inFlight = 0;
    let highWater = 0;
    const client = clientAsking(async (appId) => {
      inFlight += 1;
      highWater = Math.max(highWater, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return ok(tally(appId));
    });
    const { result } = renderTallies(client);

    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect(highWater).toBeLessThanOrEqual(6);
  });

  /**
   * One private or unreachable game must not empty the list: everything else
   * still arrives, and the row that failed keeps its dash.
   */
  it("keeps what it could count when one game fails", async () => {
    const { client } = heldClient([], (appId) =>
      appId === 2 ? err("UNAVAILABLE") : ok(tally(appId)),
    );
    const { result } = renderTallies(client);

    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect(result.current.completions[2]).toBeUndefined();
    expect(result.current.completions[1]).toEqual(tally(1));
  });

  /**
   * Nothing is ever coming for a game that failed, so it must stop pulsing
   * when its wave lands rather than at the end of the whole load.
   */
  it("stops a game that failed from pulsing, without waiting for the load", async () => {
    const { client, release } = heldClient([7, 8], (appId) =>
      appId === 2 ? err("UNAVAILABLE") : ok(tally(appId)),
    );
    const { result } = renderTallies(client);

    await waitFor(() => expect(result.current.pending).toEqual(new Set([7, 8])));

    expect(result.current.frozenOrder).not.toBeNull();
    await release();
  });

  /** Without a pinned order every wave would shuffle rows under a finger. */
  it("pins the order it fetches in while tallies are outstanding", async () => {
    const { client, release } = heldClient([7, 8]);
    const { result } = renderTallies(client);

    await waitFor(() => expect(result.current.frozenOrder).toEqual([...BY_RECENCY]));

    await release();
  });

  it("releases the order once nothing is outstanding", async () => {
    const { client } = eagerClient();
    const { result } = renderTallies(client);

    await waitFor(() => expect(result.current.pending.size).toBe(0));
    expect(result.current.frozenOrder).toBeNull();
  });

  /**
   * Choosing an order is a request to see things move, so the list re-sorts at
   * once — and then stays still, however many waves land afterwards. Three
   * waves, so there is one left to land after the choice is made.
   */
  it("re-pins to a chosen order, and the waves after it do not move the list", async () => {
    const { client, release } = heldClient([7, 8, 9, 10, 11, 12, 13, 14]);
    const { result } = renderTallies(client, LONG_LIBRARY);
    await waitFor(() => expect(result.current.pending.size).toBe(8));

    const chosen = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    act(() => result.current.repin(chosen));
    expect(result.current.frozenOrder).toEqual(chosen);

    // The second wave lands, and the third is still outstanding behind it.
    await release();
    await waitFor(() => expect(result.current.pending).toEqual(new Set([13, 14])));
    expect(result.current.frozenOrder).toEqual(chosen);

    await release();
    await waitFor(() => expect(result.current.frozenOrder).toBeNull());
  });

  /** Nothing is arriving to shuffle anything, so there is nothing to pin. */
  it("stays released when an order is chosen with nothing outstanding", async () => {
    const { client } = eagerClient();
    const { result } = renderTallies(client);
    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    act(() => result.current.repin([8, 7, 6, 5, 4, 3, 2, 1]));

    expect(result.current.frozenOrder).toBeNull();
  });

  /**
   * A player who switches profile must not have the previous library's waves
   * land on the new one, nor see its tallies while the new library loads.
   */
  it("does not let a previous library's waves land on the next one", async () => {
    const previous = heldClient(BY_RECENCY);
    const next = eagerClient();
    const { result, rerender } = renderTallies(previous.client);
    await waitFor(() => expect(result.current.pending.size).toBe(8));

    rerender({ client: next.client, games: OTHER_GAMES });
    expect(result.current.completions).toEqual({});

    await previous.release();
    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect(result.current.completions).toEqual({ 500: tally(500) });
    // Not merely ignored on arrival: the waves behind the first one are never
    // asked for at all, so an abandoned library costs no further requests.
    expect(previous.asked).toHaveLength(6);
  });

  it("has nothing outstanding while no profile is chosen", async () => {
    const { result } = renderTallies(undefined);

    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect(result.current.completions).toEqual({});
    expect(result.current.pending.size).toBe(0);
  });

  it("has nothing to count in an empty library", async () => {
    const { result } = renderTallies(clientAsking(refuse), []);

    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect(result.current.completions).toEqual({});
    expect(result.current.pending.size).toBe(0);
  });

  /**
   * Steam does not always send a last-played time. Measured on the public
   * profile 76561197997989573: 80 of its 99 games carry playtime — one of them
   * 149 hours — and not one carries the field. Reading its absence as "never
   * launched" spent no request at all on that library, so every row sat there
   * without a tally on a profile with hundreds of hours behind it.
   */
  it("counts a game the player has played even with no last-played time", async () => {
    const { client, asked } = eagerClient();
    const played = [game(1, null, 8975), game(2, null, 60)];
    const { result } = renderTallies(client, [...played, game(NEVER_PLAYED, null, 0)]);

    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect([...asked].sort()).toEqual([1, 2]);
    expect(result.current.completions[1]).toEqual(tally(1));
  });

  /**
   * Recency is the order a player recognises, so the list fills from the top
   * with what they came to look at. Where Steam withholds it, the longest
   * played is the nearest thing to it that is actually there.
   */
  it("falls back to the most played first when no last-played time is sent", async () => {
    const { client, asked } = eagerClient();
    const { result } = renderTallies(client, [
      game(1, null, 60),
      game(2, null, 8975),
      game(3, null, 600),
    ]);

    await waitFor(() => expect(result.current.frozenOrder).toBeNull());

    expect(asked).toEqual([2, 3, 1]);
  });

  it("has nothing to report before a load has started", () => {
    const { result } = renderTallies(undefined);

    expect(result.current.loaded).toBeNull();
  });

  /**
   * The card's figures grow as waves land, and something has to say they are
   * not final yet. Six of the eight launched games make up the first wave, so
   * holding one of the second leaves the load visibly part done.
   */
  it("reports how far the tallies have got while they are landing", async () => {
    const { client, release } = heldClient([7]);
    const { result } = renderTallies(client);

    await waitFor(() => expect(result.current.loaded).toBe(0.75));

    await release();

    expect(result.current.loaded).toBeNull();
  });
});

