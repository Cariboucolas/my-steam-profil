import { describe, it, expect } from "vitest";
import { mapProfile, mapGames, mapGameAchievements } from "./steam-mapper";
import {
  type SteamPlayerSummariesResponse,
  type SteamOwnedGamesResponse,
  type SteamSchemaResponse,
  type SteamPlayerAchievementsResponse,
} from "./steam-types";

const summaries = (
  players: SteamPlayerSummariesResponse["response"]["players"],
): SteamPlayerSummariesResponse => ({ response: { players } });

describe("mapProfile", () => {
  it("maps a raw player summary to a Profile", () => {
    const raw = summaries([
      {
        steamid: "76561197979269357",
        personaname: "cariboucolas",
        avatarfull: "https://avatars/full.jpg",
        profileurl: "https://steamcommunity.com/profiles/76561197979269357/",
      },
    ]);
    const result = mapProfile(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.steamId.value).toBe("76561197979269357");
      expect(result.value.personaName).toBe("cariboucolas");
      expect(result.value.avatarUrl).toBe("https://avatars/full.jpg");
    }
  });

  it("returns NOT_FOUND when no player is present", () => {
    expect(mapProfile(summaries([]))).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("mapGames", () => {
  it("maps owned games and builds the icon URL", () => {
    const raw: SteamOwnedGamesResponse = {
      response: {
        game_count: 1,
        games: [
          {
            appid: 440,
            name: "Team Fortress 2",
            playtime_forever: 405,
            img_icon_url: "abc123",
          },
        ],
      },
    };
    const games = mapGames(raw);
    expect(games).toHaveLength(1);
    expect(games[0]?.appId).toBe(440);
    expect(games[0]?.name).toBe("Team Fortress 2");
    expect(games[0]?.playtime.format()).toBe("6 h 45");
    expect(games[0]?.iconUrl).toBe(
      "https://media.steampowered.com/steamcommunity/public/images/apps/440/abc123.jpg",
    );
  });

  it("returns an empty list when the account owns no games", () => {
    expect(mapGames({ response: {} })).toEqual([]);
  });
});

describe("mapGameAchievements (nominal)", () => {
  const schema: SteamSchemaResponse = {
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

  const player: SteamPlayerAchievementsResponse = {
    playerstats: {
      success: true,
      achievements: [
        { apiname: "BOSS_1", achieved: 1, unlocktime: 1697568656 },
        { apiname: "SECRET_1", achieved: 0, unlocktime: 0 },
      ],
    },
  };

  it("joins schema and player data into domain achievements", () => {
    const result = mapGameAchievements(schema, player);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.achievements).toHaveLength(2);
    expect(result.value.completion.unlocked).toBe(1);
    expect(result.value.completion.total).toBe(2);
    expect(result.value.completion.rate.percentage).toBe(50);

    const secret = result.value.achievements.find((a) => a.apiName === "SECRET_1");
    expect(secret?.hidden).toBe(true);
    expect(secret?.description).toBe(""); // description absente → chaîne vide
    expect(secret?.unlockState.unlocked).toBe(false);
  });

  it("builds a timeline with only the unlocked achievement", () => {
    const result = mapGameAchievements(schema, player);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.timeline).toHaveLength(1);
    expect(result.value.timeline[0]?.achievement.apiName).toBe("BOSS_1");
  });
});

describe("mapGameAchievements (errors)", () => {
  const emptySchema: SteamSchemaResponse = { game: {} };
  const validSchema: SteamSchemaResponse = {
    game: {
      availableGameStats: {
        achievements: [
          { name: "A", displayName: "A", hidden: 0, icon: "i", icongray: "g" },
        ],
      },
    },
  };

  it("returns PRIVATE_PROFILE when the player stats are not public", () => {
    const player: SteamPlayerAchievementsResponse = {
      playerstats: { success: false, error: "Profile is not public" },
    };
    expect(mapGameAchievements(validSchema, player)).toEqual({
      ok: false,
      error: "PRIVATE_PROFILE",
    });
  });

  it("returns NO_ACHIEVEMENTS when the app has no stats", () => {
    const player: SteamPlayerAchievementsResponse = {
      playerstats: { success: false, error: "Requested app has no stats" },
    };
    expect(mapGameAchievements(emptySchema, player)).toEqual({
      ok: false,
      error: "NO_ACHIEVEMENTS",
    });
  });

  it("returns NO_ACHIEVEMENTS when the schema has no achievements", () => {
    const player: SteamPlayerAchievementsResponse = {
      playerstats: { success: true, achievements: [] },
    };
    expect(mapGameAchievements(emptySchema, player)).toEqual({
      ok: false,
      error: "NO_ACHIEVEMENTS",
    });
  });
});
