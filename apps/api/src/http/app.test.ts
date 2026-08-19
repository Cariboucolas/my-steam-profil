import { describe, it, expect } from "vitest";
import { createApp } from "./app";
import { createSteamClient } from "../steam/steam-client";

const API_KEY = "TEST_KEY";
const STEAM_ID = "76561197979269357";
const MALFORMED_STEAM_ID = "not-a-steam-id";

const unreachableSteam: typeof fetch = () => {
  throw new Error("this test should not have called Steam");
};

/** One Steam endpoint's canned answer: a body, and the status it comes with. */
type Answer = readonly [body: unknown, status?: number];

type SteamAnswers = {
  readonly playerSummaries?: Answer;
  readonly ownedGames?: Answer;
  readonly schemaForGame?: Answer;
  readonly playerAchievements?: Answer;
};

const reply = ([body, status = 200]: Answer): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Routes a stubbed fetch to whichever Steam endpoint the URL names. */
const steamAnswering = (answers: SteamAnswers): typeof fetch => {
  const routes: readonly (readonly [string, Answer | undefined])[] = [
    ["GetPlayerSummaries", answers.playerSummaries],
    ["GetOwnedGames", answers.ownedGames],
    ["GetSchemaForGame", answers.schemaForGame],
    ["GetPlayerAchievements", answers.playerAchievements],
  ];
  return (input) => {
    const url = String(input);
    const matched = routes.find(([fragment]) => url.includes(fragment));
    if (!matched?.[1]) {
      throw new Error(`no answer stubbed for ${url}`);
    }
    return Promise.resolve(reply(matched[1]));
  };
};

const profileOf = (steamId: string) => ({
  response: {
    players: [
      {
        steamid: steamId,
        personaname: "cariboucolas",
        avatarfull: "https://avatars/full.jpg",
        profileurl: `https://steamcommunity.com/profiles/${steamId}/`,
      },
    ],
  },
});

/**
 * Routes are exercised through a real Steam client whose fetch is stubbed, so
 * every test covers the whole chain down to the edge of the system.
 */
const appReaching = (fetchImpl: typeof fetch) =>
  createApp(createSteamClient({ apiKey: API_KEY, fetch: fetchImpl }));

describe("GET /health", () => {
  it("reports that the service is up", async () => {
    const response = await appReaching(unreachableSteam).request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("answers without asking Steam anything", async () => {
    // unreachableSteam throws if called, so reaching 200 is the assertion.
    expect((await appReaching(unreachableSteam).request("/health")).status).toBe(200);
  });
});

describe("an unknown route", () => {
  it("is a 404", async () => {
    const response = await appReaching(unreachableSteam).request("/nope");
    expect(response.status).toBe(404);
  });
});

describe("GET /api/profile/:steamId", () => {
  it("answers with the profile Steam knows", async () => {
    const app = appReaching(
      steamAnswering({ playerSummaries: [profileOf(STEAM_ID)] }),
    );

    const response = await app.request(`/api/profile/${STEAM_ID}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      steamId: STEAM_ID,
      personaName: "cariboucolas",
      avatarUrl: "https://avatars/full.jpg",
      profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}/`,
    });
  });

  it("is a 404 when Steam knows no such player", async () => {
    const app = appReaching(
      steamAnswering({ playerSummaries: [{ response: { players: [] } }] }),
    );

    const response = await app.request(`/api/profile/${STEAM_ID}`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("is a 400 when the steam id is malformed", async () => {
    const response = await appReaching(unreachableSteam).request(
      `/api/profile/${MALFORMED_STEAM_ID}`,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_STEAM_ID" });
  });

  it("rejects a malformed steam id without calling Steam at all", async () => {
    // unreachableSteam throws if called, so a clean 400 is the assertion.
    const response = await appReaching(unreachableSteam).request(
      `/api/profile/${MALFORMED_STEAM_ID}`,
    );
    expect(response.status).toBe(400);
  });
});

describe("GET /api/profile/:steamId/games", () => {
  const LAST_PLAYED_SECONDS = 1782389774;

  const library = {
    response: {
      game_count: 2,
      games: [
        {
          appid: 2066020,
          name: "Soulstone Survivors",
          playtime_forever: 4977,
          img_icon_url: "abc123",
          rtime_last_played: LAST_PLAYED_SECONDS,
        },
        {
          appid: 978520,
          name: "Legend of Keepers",
          playtime_forever: 0,
          img_icon_url: "def456",
          rtime_last_played: 0,
        },
      ],
    },
  };

  it("answers with every game the player owns", async () => {
    const app = appReaching(steamAnswering({ ownedGames: [library] }));

    const response = await app.request(`/api/profile/${STEAM_ID}/games`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        appId: 2066020,
        name: "Soulstone Survivors",
        playtimeMinutes: 4977,
        playtimeLabel: "82 h 57",
        iconUrl:
          "https://media.steampowered.com/steamcommunity/public/images/apps/2066020/abc123.jpg",
        lastPlayedAt: new Date(LAST_PLAYED_SECONDS * 1000).toISOString(),
      },
      {
        appId: 978520,
        name: "Legend of Keepers",
        playtimeMinutes: 0,
        playtimeLabel: "0 min",
        iconUrl:
          "https://media.steampowered.com/steamcommunity/public/images/apps/978520/def456.jpg",
        lastPlayedAt: null,
      },
    ]);
  });

  it("answers with an empty library rather than an error when nothing is owned", async () => {
    const app = appReaching(steamAnswering({ ownedGames: [{ response: {} }] }));

    const response = await app.request(`/api/profile/${STEAM_ID}/games`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("is a 400 when the steam id is malformed", async () => {
    const response = await appReaching(unreachableSteam).request(
      `/api/profile/${MALFORMED_STEAM_ID}/games`,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_STEAM_ID" });
  });
});
