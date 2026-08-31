import { describe, it, expect, vi } from "vitest";
import { createSteamClient } from "./steam-client";
import { SteamGatewayError } from "./steam-gateway";

const API_KEY = "TEST_KEY";
const STEAM_ID = "76561197979269357";
const APP_ID = 2066020;

const TOO_MANY_REQUESTS = 429;
const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const SERVER_ERROR = 503;
const INTERNAL_SERVER_ERROR = 500;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** A fetch that always answers the same way, and records how it was called. */
const stubFetch = (response: () => Response | Promise<Response>) =>
  vi.fn<typeof fetch>(() => Promise.resolve(response()));

const clientWith = (fetchImpl: ReturnType<typeof stubFetch>) =>
  createSteamClient({ apiKey: API_KEY, fetch: fetchImpl });

const urlOf = (fetchImpl: ReturnType<typeof stubFetch>): string =>
  String(fetchImpl.mock.calls[0]?.[0]);

describe("createSteamClient (URLs)", () => {
  it("asks GetPlayerSummaries for one steam id", async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ response: { players: [] } }));
    await clientWith(fetchImpl).getPlayerSummaries(STEAM_ID);

    const url = urlOf(fetchImpl);
    expect(url).toContain("/ISteamUser/GetPlayerSummaries/v2/");
    expect(url).toContain(`key=${API_KEY}`);
    expect(url).toContain(`steamids=${STEAM_ID}`);
  });

  it("asks GetOwnedGames for app info, so games carry a name and an icon", async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ response: {} }));
    await clientWith(fetchImpl).getOwnedGames(STEAM_ID);

    const url = urlOf(fetchImpl);
    expect(url).toContain("/IPlayerService/GetOwnedGames/v1/");
    expect(url).toContain(`steamid=${STEAM_ID}`);
    expect(url).toContain("include_appinfo=1");
  });

  it("asks GetOwnedGames for played free games, which Steam otherwise omits", async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ response: {} }));
    await clientWith(fetchImpl).getOwnedGames(STEAM_ID);

    expect(urlOf(fetchImpl)).toContain("include_played_free_games=1");
  });

  it("asks GetSchemaForGame for one app", async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ game: {} }));
    await clientWith(fetchImpl).getSchemaForGame(APP_ID);

    const url = urlOf(fetchImpl);
    expect(url).toContain("/ISteamUserStats/GetSchemaForGame/v2/");
    expect(url).toContain(`appid=${APP_ID}`);
  });

  it("asks GetPlayerAchievements for one player in one app", async () => {
    const fetchImpl = stubFetch(() =>
      jsonResponse({ playerstats: { success: true, achievements: [] } }),
    );
    await clientWith(fetchImpl).getPlayerAchievements(STEAM_ID, APP_ID);

    const url = urlOf(fetchImpl);
    expect(url).toContain("/ISteamUserStats/GetPlayerAchievements/v1/");
    expect(url).toContain(`steamid=${STEAM_ID}`);
    expect(url).toContain(`appid=${APP_ID}`);
  });

  it("never puts the api key anywhere but the query string", async () => {
    const fetchImpl = stubFetch(() => jsonResponse({ response: { players: [] } }));
    await clientWith(fetchImpl).getPlayerSummaries(STEAM_ID);

    const options = fetchImpl.mock.calls[0]?.[1];
    expect(JSON.stringify(options ?? {})).not.toContain(API_KEY);
  });
});

describe("createSteamClient (answers)", () => {
  it("returns the parsed body of a successful response", async () => {
    const payload = { response: { players: [{ steamid: STEAM_ID }] } };
    const client = clientWith(stubFetch(() => jsonResponse(payload)));
    expect(await client.getPlayerSummaries(STEAM_ID)).toEqual(payload);
  });
});

describe("createSteamClient (failures)", () => {
  it("raises when Steam rate-limits us", async () => {
    const client = clientWith(stubFetch(() => jsonResponse({}, TOO_MANY_REQUESTS)));
    await expect(client.getPlayerSummaries(STEAM_ID)).rejects.toBeInstanceOf(
      SteamGatewayError,
    );
  });

  it("raises when Steam fails on its side", async () => {
    const client = clientWith(stubFetch(() => jsonResponse({}, SERVER_ERROR)));
    await expect(client.getOwnedGames(STEAM_ID)).rejects.toBeInstanceOf(
      SteamGatewayError,
    );
  });

  it("carries the status it failed on, so the cause can be logged", async () => {
    const client = clientWith(stubFetch(() => jsonResponse({}, SERVER_ERROR)));
    await expect(client.getOwnedGames(STEAM_ID)).rejects.toMatchObject({
      status: SERVER_ERROR,
    });
  });

  it("raises when the network is unreachable", async () => {
    const client = clientWith(
      stubFetch(() => {
        throw new TypeError("network down");
      }),
    );
    await expect(client.getPlayerSummaries(STEAM_ID)).rejects.toBeInstanceOf(
      SteamGatewayError,
    );
  });

  it("raises when Steam answers something that is not JSON", async () => {
    const client = clientWith(
      stubFetch(() => new Response("<html>maintenance</html>", { status: 200 })),
    );
    await expect(client.getPlayerSummaries(STEAM_ID)).rejects.toBeInstanceOf(
      SteamGatewayError,
    );
  });

  it("never leaks the api key in the error it raises", async () => {
    const client = clientWith(stubFetch(() => jsonResponse({}, SERVER_ERROR)));
    await expect(client.getPlayerSummaries(STEAM_ID)).rejects.toSatisfy(
      (error: unknown) => !String(error).includes(API_KEY),
    );
  });
});

/**
 * Steam answers 400 for a game with no stats and 403 for a private profile, and
 * puts a meaningful body in both. Raising on those would turn two normal
 * outcomes into gateway failures, so the client hands the body over and lets the
 * mapper decide.
 */
describe("createSteamClient (Steam's meaningful 4xx)", () => {
  it("returns the body of a 400 saying the app has no stats", async () => {
    const body = {
      playerstats: { error: "Requested app has no stats", success: false },
    };
    const client = clientWith(stubFetch(() => jsonResponse(body, BAD_REQUEST)));
    expect(await client.getPlayerAchievements(STEAM_ID, APP_ID)).toEqual(body);
  });

  it("returns the body of a 403 saying the profile is private", async () => {
    const body = {
      playerstats: { error: "Profile is not public", success: false },
    };
    const client = clientWith(stubFetch(() => jsonResponse(body, FORBIDDEN)));
    expect(await client.getPlayerAchievements(STEAM_ID, APP_ID)).toEqual(body);
  });

  it("returns the empty schema Steam sends for a game with no achievements", async () => {
    const client = clientWith(stubFetch(() => jsonResponse({ game: {} }, BAD_REQUEST)));
    expect(await client.getSchemaForGame(APP_ID)).toEqual({ game: {} });
  });
});

/**
 * The tolerance above is scoped to the one call Steam uses those statuses for.
 * Everywhere else a 4xx means something is wrong with us — a revoked key, most
 * likely — and answering with the error body would turn that into an empty
 * library rather than an outage.
 */
describe("createSteamClient (4xx everywhere else)", () => {
  it("raises when the library call is refused", async () => {
    const client = clientWith(
      stubFetch(() => jsonResponse({ response: {} }, FORBIDDEN)),
    );
    await expect(client.getOwnedGames(STEAM_ID)).rejects.toBeInstanceOf(
      SteamGatewayError,
    );
  });

  it("raises when the profile call is refused", async () => {
    const client = clientWith(stubFetch(() => jsonResponse({}, FORBIDDEN)));
    await expect(client.getPlayerSummaries(STEAM_ID)).rejects.toBeInstanceOf(
      SteamGatewayError,
    );
  });

  it("raises when the profile call is rejected as a bad request", async () => {
    const client = clientWith(stubFetch(() => jsonResponse({}, BAD_REQUEST)));
    await expect(client.getPlayerSummaries(STEAM_ID)).rejects.toBeInstanceOf(
      SteamGatewayError,
    );
  });
});

/**
 * Steam says "this app keeps no stats" with a 400 for most games and with a 500
 * for a few. Measured on appId 24400, which answers 500 five times out of five
 * and whose schema declares no achievements at all — so the 500 is a standing
 * property of the game, not Steam having a bad minute.
 *
 * The body is what tells the two apart. When Steam is answering it sends its
 * own playerstats envelope; when the request itself is wrong, or Steam is down,
 * it sends an HTML error page, which is not an answer and must not become one.
 */
describe("createSteamClient (Steam's meaningful 500)", () => {
  it("returns the body of a 500 that carries Steam's own answer", async () => {
    const body = {
      playerstats: { error: "Internal server error", success: false },
    };
    const client = clientWith(
      stubFetch(() => jsonResponse(body, INTERNAL_SERVER_ERROR)),
    );
    expect(await client.getPlayerAchievements(STEAM_ID, APP_ID)).toEqual(body);
  });

  it("raises on a 500 that is Steam failing rather than answering", async () => {
    const client = clientWith(
      stubFetch(
        () =>
          new Response("<html><body>Internal Server Error</body></html>", {
            status: INTERNAL_SERVER_ERROR,
          }),
      ),
    );
    await expect(
      client.getPlayerAchievements(STEAM_ID, APP_ID),
    ).rejects.toBeInstanceOf(SteamGatewayError);
  });

  /**
   * Scoped to the player call, which is the only one measured answering this
   * way. A 500 anywhere else is Steam being down, and reading it would turn an
   * outage into a library of games that appear to have nothing to earn.
   */
  it("still raises when the schema call answers 500", async () => {
    const client = clientWith(
      stubFetch(() => jsonResponse({ game: {} }, INTERNAL_SERVER_ERROR)),
    );
    await expect(client.getSchemaForGame(APP_ID)).rejects.toBeInstanceOf(
      SteamGatewayError,
    );
  });
});

/**
 * A library open makes one call per game the player has ever launched, so
 * "Steam answered 500" on its own leaves an operator with nothing to go on:
 * not which game, not which player, not whether it was one call or all of
 * them. Naming the parameters costs no secret — the key is set on the URL and
 * never travels in them.
 */
describe("createSteamClient (what a failure says)", () => {
  const namesTheQuestion = (error: unknown): boolean => {
    const message = String(error);
    return message.includes(STEAM_ID) && message.includes(String(APP_ID));
  };

  it("names what it was asking about when Steam refuses", async () => {
    const client = clientWith(stubFetch(() => jsonResponse({}, SERVER_ERROR)));

    await expect(
      client.getPlayerAchievements(STEAM_ID, APP_ID),
    ).rejects.toSatisfy(namesTheQuestion);
  });

  it("names what it was asking about when Steam cannot be reached", async () => {
    const client = clientWith(
      stubFetch(() => {
        throw new TypeError("network down");
      }),
    );

    await expect(
      client.getPlayerAchievements(STEAM_ID, APP_ID),
    ).rejects.toSatisfy(namesTheQuestion);
  });

  it("names what it was asking about when the answer is not JSON", async () => {
    const client = clientWith(
      stubFetch(() => new Response("<html>maintenance</html>", { status: 200 })),
    );

    await expect(
      client.getPlayerAchievements(STEAM_ID, APP_ID),
    ).rejects.toSatisfy(namesTheQuestion);
  });

  it("still keeps the api key out of the richer message", async () => {
    const client = clientWith(stubFetch(() => jsonResponse({}, SERVER_ERROR)));

    await expect(
      client.getPlayerAchievements(STEAM_ID, APP_ID),
    ).rejects.toSatisfy((error: unknown) => !String(error).includes(API_KEY));
  });
});

