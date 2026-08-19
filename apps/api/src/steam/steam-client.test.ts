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

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** A fetch that always answers the same way, and records how it was called. */
const stubFetch = (response: () => Response | Promise<Response>) =>
  vi.fn((input: string | URL | Request, init?: RequestInit) => {
    void input;
    void init;
    return Promise.resolve(response());
  });

const clientWith = (fetchImpl: ReturnType<typeof stubFetch>) =>
  createSteamClient({ apiKey: API_KEY, fetch: fetchImpl as unknown as typeof fetch });

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
