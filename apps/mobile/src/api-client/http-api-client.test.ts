import type { GameProgressDto, GameTallyDto, ProfileDto } from "@steam/contracts";

import { createHttpApiClient } from "./http-api-client";

const BASE_URL = "http://localhost:3000";
const STEAM_ID = "76561197979269357";
const APP_ID = 2066020;

const profile: ProfileDto = {
  steamId: STEAM_ID,
  personaName: "cariboucolas",
  avatarUrl: "https://avatars/full.jpg",
  profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}/`,
};

const progress: GameProgressDto = {
  completion: { unlocked: 353, total: 483, percentage: 73.08 },
  achievements: [],
  timeline: [],
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const clientAnswering = (answer: (url: string) => Response | Promise<Response>) =>
  createHttpApiClient({
    baseUrl: BASE_URL,
    steamId: STEAM_ID,
    fetch: ((input) => Promise.resolve(answer(String(input)))) as typeof fetch,
  });

const clientReturning = (body: unknown, status = 200) => clientAnswering(() => json(body, status));

describe("createHttpApiClient (addresses)", () => {
  const urlsAsked = async (
    call: (client: ReturnType<typeof clientAnswering>) => Promise<unknown>,
  ) => {
    const seen: string[] = [];
    const client = clientAnswering((url) => {
      seen.push(url);
      return json({});
    });
    await call(client);
    return seen;
  };

  it("asks the backend for the configured player's profile", async () => {
    const [url] = await urlsAsked((client) => client.getProfile());
    expect(url).toBe(`${BASE_URL}/api/profile/${STEAM_ID}`);
  });

  it("asks the backend for the configured player's games", async () => {
    const [url] = await urlsAsked((client) => client.getGames());
    expect(url).toBe(`${BASE_URL}/api/profile/${STEAM_ID}/games`);
  });

  it("asks the backend for progress in one game", async () => {
    const [url] = await urlsAsked((client) => client.getGameProgress(APP_ID));
    expect(url).toBe(`${BASE_URL}/api/profile/${STEAM_ID}/games/${APP_ID}/progress`);
  });

  /**
   * The one address the app asks that names no player. Rarity is the same for
   * everyone, and the backend caches on the URL, so a steam id here would give
   * every player a private copy of an answer they all share (ADR-0008).
   */
  it("asks for a game's rarity at an address that names no player", async () => {
    const [url] = await urlsAsked((client) => client.getGameRarity(APP_ID));
    expect(url).toBe(`${BASE_URL}/api/games/${APP_ID}/rarity`);
    expect(url).not.toContain(STEAM_ID);
  });

  /**
   * The second address that names no player, and for the same reason: what a
   * game calls its achievements is the game's, not the asker's (ADR-0008).
   */
  it("asks for a game's achievements at an address that names no player", async () => {
    const [url] = await urlsAsked((client) => client.getAchievementNames(APP_ID));
    expect(url).toBe(`${BASE_URL}/api/games/${APP_ID}/achievements`);
    expect(url).not.toContain(STEAM_ID);
  });

  it("does not mind a base url with a trailing slash", async () => {
    const client = createHttpApiClient({
      baseUrl: `${BASE_URL}/`,
      steamId: STEAM_ID,
      fetch: ((input: string | URL | Request) => {
        expect(String(input)).toBe(`${BASE_URL}/api/profile/${STEAM_ID}`);
        return Promise.resolve(json(profile));
      }) as typeof fetch,
    });
    await client.getProfile();
  });
});

describe("createHttpApiClient (answers)", () => {
  it("hands back the profile the backend sent", async () => {
    expect(await clientReturning(profile).getProfile()).toEqual({
      ok: true,
      value: profile,
    });
  });

  it("hands back an empty library as a success", async () => {
    expect(await clientReturning([]).getGames()).toEqual({ ok: true, value: [] });
  });

  it("hands back progress in one game", async () => {
    expect(await clientReturning(progress).getGameProgress(APP_ID)).toEqual({
      ok: true,
      value: progress,
    });
  });
});

describe("createHttpApiClient (failures)", () => {
  it("reads a 404 as no such profile", async () => {
    expect(await clientReturning({ error: "NOT_FOUND" }, 404).getProfile()).toEqual({
      ok: false,
      error: "NOT_FOUND",
    });
  });

  it("reads a 403 as a private profile", async () => {
    expect(
      await clientReturning({ error: "PRIVATE_PROFILE" }, 403).getGameProgress(APP_ID),
    ).toEqual({ ok: false, error: "PRIVATE_PROFILE" });
  });

  it("reads a 400 as a steam id the backend refuses", async () => {
    expect(await clientReturning({ error: "INVALID_STEAM_ID" }, 400).getProfile()).toEqual({
      ok: false,
      error: "INVALID_STEAM_ID",
    });
  });

  it("reads a 502 as the service being unavailable", async () => {
    expect(await clientReturning({ error: "STEAM_UNAVAILABLE" }, 502).getGames()).toEqual({
      ok: false,
      error: "UNAVAILABLE",
    });
  });

  it("reads a 500 as the service being unavailable", async () => {
    expect(await clientReturning({ error: "INTERNAL_ERROR" }, 500).getGames()).toEqual({
      ok: false,
      error: "UNAVAILABLE",
    });
  });

  it("reads an unreachable backend as unavailable rather than crashing", async () => {
    const client = createHttpApiClient({
      baseUrl: BASE_URL,
      steamId: STEAM_ID,
      fetch: (() => Promise.reject(new TypeError("Network request failed"))) as typeof fetch,
    });
    expect(await client.getProfile()).toEqual({ ok: false, error: "UNAVAILABLE" });
  });

  it("reads an answer that is not JSON as unavailable", async () => {
    const client = clientAnswering(() => new Response("<html>oops</html>"));
    expect(await client.getProfile()).toEqual({ ok: false, error: "UNAVAILABLE" });
  });
});

describe("createHttpApiClient (completion)", () => {
  const tally: GameTallyDto = {
    completion: { unlocked: 353, total: 483, percentage: 73.08 },
    unlocks: [
      { apiName: "BOSS_1", at: 1697568656 },
      { apiName: "BOSS_2", at: 1697655056 },
    ],
  };

  it("asks the backend for one game's tally", async () => {
    const seen: string[] = [];
    const client = clientAnswering((url) => {
      seen.push(url);
      return json(tally);
    });

    await client.getGameTally(APP_ID);

    expect(seen).toEqual([`${BASE_URL}/api/profile/${STEAM_ID}/games/${APP_ID}/completion`]);
  });

  it("serves the tally the backend answered with", async () => {
    const client = clientReturning(tally);

    expect(await client.getGameTally(APP_ID)).toEqual({
      ok: true,
      value: tally,
    });
  });

  it("reports a private profile as such", async () => {
    const client = clientReturning({ error: "PRIVATE_PROFILE" }, 403);

    expect(await client.getGameTally(APP_ID)).toEqual({
      ok: false,
      error: "PRIVATE_PROFILE",
    });
  });

  it("reports a backend that is down as unavailable", async () => {
    const client = clientAnswering(() => {
      throw new TypeError("network down");
    });

    expect(await client.getGameTally(APP_ID)).toEqual({
      ok: false,
      error: "UNAVAILABLE",
    });
  });
});

/**
 * The six places are one budget for the whole app (#162): `useApiClient` builds
 * a client per component and per SteamId, so the queue is shared by every
 * instance rather than owned by one.
 */
describe("createHttpApiClient (the six-request budget)", () => {
  /** Every call a test made, dropped when it ends so the next finds six places. */
  let untilTheTestEnds: AbortController;

  beforeEach(() => {
    untilTheTestEnds = new AbortController();
  });

  afterEach(() => {
    untilTheTestEnds.abort();
  });

  /** A backend that answers a request only when the test says so. */
  const heldBackend = () => {
    const sent: {
      url: string;
      signal: AbortSignal | undefined;
      answer: (body: unknown) => void;
    }[] = [];
    const fetchHeld = ((input: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        sent.push({
          url: String(input),
          signal: init?.signal ?? undefined,
          answer: (body) => resolve(json(body)),
        });
      })) as typeof fetch;

    const clientFor = (steamId: string) =>
      createHttpApiClient({ baseUrl: BASE_URL, steamId, fetch: fetchHeld });

    return {
      sent,
      clientFor,
      appIdsSent: () => sent.map(({ url }) => Number(/games\/(\d+)/.exec(url)?.[1])),
    };
  };

  const OTHER_STEAM_ID = "76561198000000000";

  it("leaves six requests in flight when two clients make twenty", () => {
    const { sent, clientFor } = heldBackend();
    const one = clientFor(STEAM_ID);
    const other = clientFor(OTHER_STEAM_ID);

    for (let appId = 1; appId <= 10; appId += 1) {
      void one.getGameTally(appId, untilTheTestEnds.signal);
      void other.getGameTally(appId, untilTheTestEnds.signal);
    }

    expect(sent).toHaveLength(6);
  });

  it("gives the place of a request aborted in flight to the next in the queue", async () => {
    const { clientFor, appIdsSent } = heldBackend();
    const client = clientFor(STEAM_ID);
    const left = new AbortController();

    void client.getGameTally(1, left.signal);
    for (let appId = 2; appId <= 7; appId += 1) {
      void client.getGameTally(appId, untilTheTestEnds.signal);
    }
    expect(appIdsSent()).toEqual([1, 2, 3, 4, 5, 6]);

    left.abort();
    await Promise.resolve();

    expect(appIdsSent()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  /**
   * A screen that leaves aborts every request it made, one after the other.
   * Were a place handed over at the first abort, a request the screen is about
   * to abort next would be sent in it, to answer nobody (#168).
   */
  it("sends nothing in the place of a request abandoned with the ones waiting behind it", async () => {
    const { clientFor, appIdsSent } = heldBackend();
    const client = clientFor(STEAM_ID);
    const leaving = [1, 2, 3, 4, 5, 6, 7, 8].map(() => new AbortController());

    leaving.forEach((left, index) => void client.getGameTally(index + 1, left.signal));
    for (const left of leaving) left.abort();
    await Promise.resolve();

    expect(appIdsSent()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  /** A place given up at the abort is not given up again when the answer lands. */
  it("frees one place, not two, when an aborted request is answered after all", async () => {
    const { sent, clientFor, appIdsSent } = heldBackend();
    const client = clientFor(STEAM_ID);
    const left = new AbortController();

    const aborted = client.getGameTally(1, left.signal);
    for (let appId = 2; appId <= 9; appId += 1) {
      void client.getGameTally(appId, untilTheTestEnds.signal);
    }

    left.abort();
    sent[0]?.answer({});
    await aborted;
    await Promise.resolve();

    expect(appIdsSent()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("sends what waited in the order it was asked", async () => {
    const { sent, clientFor, appIdsSent } = heldBackend();
    const one = clientFor(STEAM_ID);
    const other = clientFor(OTHER_STEAM_ID);

    const first = [1, 2, 3, 4, 5, 6].map((appId) =>
      one.getGameTally(appId, untilTheTestEnds.signal),
    );
    void other.getGameTally(30, untilTheTestEnds.signal);
    void one.getGameTally(10, untilTheTestEnds.signal);
    void other.getGameTally(20, untilTheTestEnds.signal);

    sent[3]?.answer({});
    await first[3];
    expect(appIdsSent().slice(6)).toEqual([30]);

    sent[0]?.answer({});
    sent[5]?.answer({});
    await Promise.all([first[0], first[5]]);
    expect(appIdsSent().slice(6)).toEqual([30, 10, 20]);
  });

  /**
   * A game opened while the library counts is waiting on one request, and the
   * count on hundreds: the player's goes first, or the game page waits for the
   * whole library.
   */
  it("sends what the player opened ahead of the counting still waiting", async () => {
    const { sent, clientFor } = heldBackend();
    const client = clientFor(STEAM_ID);

    const counting = [1, 2, 3, 4, 5, 6].map((appId) =>
      client.getGameTally(appId, untilTheTestEnds.signal),
    );
    void client.getGameTally(7, untilTheTestEnds.signal);
    void client.getGameRarity(8, untilTheTestEnds.signal);
    void client.getAchievementNames(9, untilTheTestEnds.signal);
    void client.getGameProgress(10, untilTheTestEnds.signal);

    sent[0]?.answer({});
    await counting[0];
    await Promise.resolve();

    expect(sent[6]?.url).toBe(`${BASE_URL}/api/profile/${STEAM_ID}/games/10/progress`);
  });

  it("sends the Profile and the Games ahead of the counting still waiting", async () => {
    const { sent, clientFor } = heldBackend();
    const client = clientFor(STEAM_ID);

    const counting = [1, 2, 3, 4, 5, 6].map((appId) =>
      client.getGameTally(appId, untilTheTestEnds.signal),
    );
    void client.getGameTally(7, untilTheTestEnds.signal);
    void client.getProfile(untilTheTestEnds.signal);
    void client.getGames(untilTheTestEnds.signal);

    sent[0]?.answer({});
    sent[1]?.answer({});
    await Promise.all([counting[0], counting[1]]);
    await Promise.resolve();

    expect(sent.slice(6).map(({ url }) => url)).toEqual([
      `${BASE_URL}/api/profile/${STEAM_ID}`,
      `${BASE_URL}/api/profile/${STEAM_ID}/games`,
    ]);
  });

  it("never sends a request aborted while it waited", async () => {
    const { sent, clientFor, appIdsSent } = heldBackend();
    const client = clientFor(STEAM_ID);
    const left = new AbortController();

    const first = [1, 2, 3, 4, 5, 6].map((appId) =>
      client.getGameTally(appId, untilTheTestEnds.signal),
    );
    void client.getGameTally(7, left.signal);
    void client.getGameTally(8, untilTheTestEnds.signal);

    left.abort();
    sent[0]?.answer({});
    sent[1]?.answer({});
    await Promise.all([first[0], first[1]]);

    expect(appIdsSent()).toEqual([1, 2, 3, 4, 5, 6, 8]);
  });

  it("never sends a request whose signal had already aborted", () => {
    const { sent, clientFor } = heldBackend();
    const left = new AbortController();
    left.abort();

    void clientFor(STEAM_ID).getProfile(left.signal);

    expect(sent).toEqual([]);
  });

  it("hands the signal to the request, so one in flight is aborted with it", () => {
    const { sent, clientFor } = heldBackend();

    void clientFor(STEAM_ID).getGames(untilTheTestEnds.signal);

    expect(sent[0]?.signal).toBe(untilTheTestEnds.signal);
  });

  /** The port never rejects for an expected failure, an abort included (ADR-0002). */
  it.each([
    ["while it waited", 7],
    ["in flight", 1],
  ])("answers a call aborted %s as unavailable", async (_when, aborted) => {
    const { clientFor } = heldBackend();
    const client = clientFor(STEAM_ID);
    const left = new AbortController();

    const calls = [1, 2, 3, 4, 5, 6, 7].map((appId) =>
      client.getGameTally(appId, appId === aborted ? left.signal : untilTheTestEnds.signal),
    );
    left.abort();

    expect(await calls[aborted - 1]).toEqual({ ok: false, error: "UNAVAILABLE" });
  });
});
