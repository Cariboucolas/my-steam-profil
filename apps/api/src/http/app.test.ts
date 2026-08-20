import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "./app";
import { createSteamClient } from "../steam/steam-client";

const API_KEY = "TEST_KEY";
const STEAM_ID = "76561197979269357";
const MALFORMED_STEAM_ID = "not-a-steam-id";

/** Steam counts in seconds; JavaScript dates in milliseconds. */
const SECONDS_TO_MS = 1000;

/**
 * Every failure the app answers is logged with its cause, which would print a
 * stack trace per test. Spying keeps the output readable, and lets the logging
 * itself be asserted.
 */
let logged: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  logged.mockRestore();
});

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

  /**
   * Steam echoing an id the domain refuses is Steam misbehaving, not a player
   * who does not exist. Reporting it as a missing profile would send the caller
   * looking in the wrong place.
   */
  it("is a 502, not a 404, when Steam answers with an unusable id", async () => {
    const nonsense = {
      response: {
        players: [
          {
            steamid: "not-a-steam-id",
            personaname: "cariboucolas",
            avatarfull: "https://avatars/full.jpg",
            profileurl: "https://steamcommunity.com/profiles/x/",
          },
        ],
      },
    };
    const app = appReaching(steamAnswering({ playerSummaries: [nonsense] }));

    const response = await app.request(`/api/profile/${STEAM_ID}`);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "STEAM_UNAVAILABLE" });
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
        lastPlayedAt: new Date(LAST_PLAYED_SECONDS * SECONDS_TO_MS).toISOString(),
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

describe("GET /api/profile/:steamId/games/:appId/progress", () => {
  const APP_ID = 2066020;
  const UNLOCK_SECONDS = 1697568656;

  const BAD_REQUEST_FROM_STEAM = 400;
  const FORBIDDEN_FROM_STEAM = 403;

  const schema = {
    game: {
      gameName: "Demo",
      availableGameStats: {
        achievements: [
          {
            name: "BOSS_1",
            displayName: "First boss",
            description: "Beat the first boss.",
            hidden: 0,
            icon: "icon1.jpg",
            icongray: "gray1.jpg",
          },
          {
            name: "SECRET_1",
            displayName: "Secret",
            hidden: 1,
            icon: "icon2.jpg",
            icongray: "gray2.jpg",
          },
        ],
      },
    },
  };

  const halfDone = {
    playerstats: {
      success: true,
      achievements: [
        { apiname: "BOSS_1", achieved: 1, unlocktime: UNLOCK_SECONDS },
        { apiname: "SECRET_1", achieved: 0, unlocktime: 0 },
      ],
    },
  };

  const url = `/api/profile/${STEAM_ID}/games/${APP_ID}/progress`;

  it("answers with completion, achievements and timeline", async () => {
    const app = appReaching(
      steamAnswering({ schemaForGame: [schema], playerAchievements: [halfDone] }),
    );

    const response = await app.request(url);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      completion: { unlocked: 1, total: 2, percentage: 50 },
      achievements: [
        {
          apiName: "BOSS_1",
          displayName: "First boss",
          description: "Beat the first boss.",
          hidden: false,
          icon: "icon1.jpg",
          iconGray: "gray1.jpg",
          unlocked: true,
          unlockedAt: new Date(UNLOCK_SECONDS * SECONDS_TO_MS).toISOString(),
        },
        {
          apiName: "SECRET_1",
          displayName: "Secret",
          description: "",
          hidden: true,
          icon: "icon2.jpg",
          iconGray: "gray2.jpg",
          unlocked: false,
          unlockedAt: null,
        },
      ],
      timeline: [
        {
          apiName: "BOSS_1",
          unlockedAt: new Date(UNLOCK_SECONDS * SECONDS_TO_MS).toISOString(),
        },
      ],
    });
  });

  it("counts a game owned but never launched as zero of its real total", async () => {
    const untouched = {
      playerstats: {
        success: true,
        achievements: [
          { apiname: "BOSS_1", achieved: 0, unlocktime: 0 },
          { apiname: "SECRET_1", achieved: 0, unlocktime: 0 },
        ],
      },
    };
    const app = appReaching(
      steamAnswering({ schemaForGame: [schema], playerAchievements: [untouched] }),
    );

    const response = await app.request(url);
    const body = (await response.json()) as { completion: unknown };

    expect(response.status).toBe(200);
    expect(body.completion).toEqual({ unlocked: 0, total: 2, percentage: 0 });
  });

  /**
   * Steam reports a game with nothing to earn as HTTP 400 with a body saying
   * so. That is a normal answer, and it has to survive the whole chain as a
   * 200 carrying an empty progress.
   */
  it("is a 200 with an empty progress when the game defines no achievements", async () => {
    const app = appReaching(
      steamAnswering({
        schemaForGame: [{ game: {} }, BAD_REQUEST_FROM_STEAM],
        playerAchievements: [
          { playerstats: { success: false, error: "Requested app has no stats" } },
          BAD_REQUEST_FROM_STEAM,
        ],
      }),
    );

    const response = await app.request(url);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      completion: { unlocked: 0, total: 0, percentage: 0 },
      achievements: [],
      timeline: [],
    });
  });

  /** Steam reports a private profile as HTTP 403, again with a body. */
  it("is a 403 when the profile is private", async () => {
    const app = appReaching(
      steamAnswering({
        schemaForGame: [schema],
        playerAchievements: [
          { playerstats: { success: false, error: "Profile is not public" } },
          FORBIDDEN_FROM_STEAM,
        ],
      }),
    );

    const response = await app.request(url);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "PRIVATE_PROFILE" });
  });

  it("is a 400 when the steam id is malformed", async () => {
    const response = await appReaching(unreachableSteam).request(
      `/api/profile/${MALFORMED_STEAM_ID}/games/${APP_ID}/progress`,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_STEAM_ID" });
  });

  it("is a 400 when the app id is not a number", async () => {
    const response = await appReaching(unreachableSteam).request(
      `/api/profile/${STEAM_ID}/games/not-an-app/progress`,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_APP_ID" });
  });

  it("is a 400 when the app id is zero or negative", async () => {
    const response = await appReaching(unreachableSteam).request(
      `/api/profile/${STEAM_ID}/games/0/progress`,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_APP_ID" });
  });

  it("rejects a malformed app id without calling Steam at all", async () => {
    // unreachableSteam throws if called, so a clean 400 is the assertion.
    const response = await appReaching(unreachableSteam).request(
      `/api/profile/${STEAM_ID}/games/-3/progress`,
    );
    expect(response.status).toBe(400);
  });
});

describe("when something fails on the way", () => {
  const STEAM_SERVER_ERROR = 503;

  it("logs the cause an operator would need, even though the body hides it", async () => {
    const app = appReaching(
      steamAnswering({ playerSummaries: [{}, STEAM_SERVER_ERROR] }),
    );

    await app.request(`/api/profile/${STEAM_ID}`);

    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("is a 502 when Steam is unavailable", async () => {
    const app = appReaching(
      steamAnswering({ playerSummaries: [{}, STEAM_SERVER_ERROR] }),
    );

    const response = await app.request(`/api/profile/${STEAM_ID}`);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "STEAM_UNAVAILABLE" });
  });

  it("is a 502 when Steam rate-limits us", async () => {
    const TOO_MANY_REQUESTS = 429;
    const app = appReaching(
      steamAnswering({ ownedGames: [{}, TOO_MANY_REQUESTS] }),
    );

    const response = await app.request(`/api/profile/${STEAM_ID}/games`);

    expect(response.status).toBe(502);
  });

  /**
   * A negative playtime breaks a domain invariant, so Playtime throws rather
   * than returning a Result (ADR-0002). Nothing should turn that into a lie
   * about Steam being down.
   */
  it("is a 500, not a 502, when our own invariants break", async () => {
    const impossible = {
      response: {
        games: [
          {
            appid: 440,
            name: "Team Fortress 2",
            playtime_forever: -1,
            img_icon_url: "abc123",
          },
        ],
      },
    };
    const app = appReaching(steamAnswering({ ownedGames: [impossible] }));

    const response = await app.request(`/api/profile/${STEAM_ID}/games`);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "INTERNAL_ERROR" });
  });

  it("never lets an error body carry the api key", async () => {
    const app = appReaching(
      steamAnswering({ playerSummaries: [{}, STEAM_SERVER_ERROR] }),
    );

    const body = await (await app.request(`/api/profile/${STEAM_ID}`)).text();

    expect(body).not.toContain(API_KEY);
  });

  it("never lets an error body carry a stack trace", async () => {
    const app = appReaching(
      steamAnswering({ playerSummaries: [{}, STEAM_SERVER_ERROR] }),
    );

    const body = await (await app.request(`/api/profile/${STEAM_ID}`)).text();

    expect(body).not.toMatch(/at .*\.ts:/);
  });
});

/**
 * The app runs in a browser while it is being built, on a different port to
 * this service. Without these headers the browser refuses every answer, and the
 * app cannot tell that apart from the backend being down.
 *
 * This is a permission, not a protection: the service has no authentication, so
 * anything that is not a browser can call it regardless.
 */
describe("cross-origin requests", () => {
  const ORIGIN = "http://localhost:8081";

  it("lets a browser on another port read the answer", async () => {
    const app = appReaching(
      steamAnswering({ playerSummaries: [profileOf(STEAM_ID)] }),
    );

    const response = await app.request(`/api/profile/${STEAM_ID}`, {
      headers: { Origin: ORIGIN },
    });

    expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
  });

  it("answers the preflight a browser sends first", async () => {
    const app = appReaching(unreachableSteam);

    const response = await app.request(`/api/profile/${STEAM_ID}`, {
      method: "OPTIONS",
      headers: {
        Origin: ORIGIN,
        "Access-Control-Request-Method": "GET",
      },
    });

    expect(response.status).toBeLessThan(300);
    expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});
