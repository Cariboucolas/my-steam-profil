import type { GameCompletionDto, GameProgressDto, ProfileDto } from "@steam/contracts";

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

const clientAnswering = (
  answer: (url: string) => Response | Promise<Response>,
) =>
  createHttpApiClient({
    baseUrl: BASE_URL,
    steamId: STEAM_ID,
    fetch: ((input) => Promise.resolve(answer(String(input)))) as typeof fetch,
  });

const clientReturning = (body: unknown, status = 200) =>
  clientAnswering(() => json(body, status));

describe("createHttpApiClient (addresses)", () => {
  const urlsAsked = async (call: (client: ReturnType<typeof clientAnswering>) => Promise<unknown>) => {
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
    expect(url).toBe(
      `${BASE_URL}/api/profile/${STEAM_ID}/games/${APP_ID}/progress`,
    );
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
    expect(
      await clientReturning({ error: "INVALID_STEAM_ID" }, 400).getProfile(),
    ).toEqual({ ok: false, error: "INVALID_STEAM_ID" });
  });

  it("reads a 502 as the service being unavailable", async () => {
    expect(
      await clientReturning({ error: "STEAM_UNAVAILABLE" }, 502).getGames(),
    ).toEqual({ ok: false, error: "UNAVAILABLE" });
  });

  it("reads a 500 as the service being unavailable", async () => {
    expect(
      await clientReturning({ error: "INTERNAL_ERROR" }, 500).getGames(),
    ).toEqual({ ok: false, error: "UNAVAILABLE" });
  });

  it("reads an unreachable backend as unavailable rather than crashing", async () => {
    const client = createHttpApiClient({
      baseUrl: BASE_URL,
      steamId: STEAM_ID,
      fetch: (() =>
        Promise.reject(new TypeError("Network request failed"))) as typeof fetch,
    });
    expect(await client.getProfile()).toEqual({ ok: false, error: "UNAVAILABLE" });
  });

  it("reads an answer that is not JSON as unavailable", async () => {
    const client = clientAnswering(() => new Response("<html>oops</html>"));
    expect(await client.getProfile()).toEqual({ ok: false, error: "UNAVAILABLE" });
  });
});

describe("createHttpApiClient (completion)", () => {
  const completion: GameCompletionDto = {
    unlocked: 353,
    total: 483,
    percentage: 73.08,
  };

  it("asks the backend for one game's tally", async () => {
    const seen: string[] = [];
    const client = clientAnswering((url) => {
      seen.push(url);
      return json(completion);
    });

    await client.getGameCompletion(APP_ID);

    expect(seen).toEqual([
      `${BASE_URL}/api/profile/${STEAM_ID}/games/${APP_ID}/completion`,
    ]);
  });

  it("serves the tally the backend answered with", async () => {
    const client = clientReturning(completion);

    expect(await client.getGameCompletion(APP_ID)).toEqual({
      ok: true,
      value: completion,
    });
  });

  it("reports a private profile as such", async () => {
    const client = clientReturning({ error: "PRIVATE_PROFILE" }, 403);

    expect(await client.getGameCompletion(APP_ID)).toEqual({
      ok: false,
      error: "PRIVATE_PROFILE",
    });
  });

  it("reports a backend that is down as unavailable", async () => {
    const client = clientAnswering(() => {
      throw new TypeError("network down");
    });

    expect(await client.getGameCompletion(APP_ID)).toEqual({
      ok: false,
      error: "UNAVAILABLE",
    });
  });
});
