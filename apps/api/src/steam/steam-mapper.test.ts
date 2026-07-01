import { describe, it, expect } from "vitest";
import { mapProfile, mapGames } from "./steam-mapper";
import {
  type SteamPlayerSummariesResponse,
  type SteamOwnedGamesResponse,
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
