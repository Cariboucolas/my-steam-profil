import { describe, it, expect } from "vitest";
import {
  mapProfile,
  mapGames,
  mapGameProgress,
  mapGameTally,
  mapGameRarity,
} from "./steam-mapper";
import {
  type SteamPlayerSummariesResponse,
  type SteamOwnedGamesResponse,
  type SteamSchemaResponse,
  type SteamPlayerAchievementsResponse,
  type SteamGlobalAchievementPercentagesResponse,
  type SteamGlobalAchievementPercentage,
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

  it("maps the last played timestamp, which Steam sends in seconds", () => {
    const games = mapGames({
      response: {
        games: [
          {
            appid: 440,
            name: "Team Fortress 2",
            playtime_forever: 405,
            img_icon_url: "abc123",
            rtime_last_played: 1782389774,
          },
        ],
      },
    });
    expect(games[0]?.lastPlayed).toEqual(new Date(1782389774 * 1000));
  });

  it("has no last played date for a game that was never launched", () => {
    const games = mapGames({
      response: {
        games: [
          {
            appid: 978520,
            name: "Legend of Keepers",
            playtime_forever: 0,
            img_icon_url: "abc123",
            rtime_last_played: 0,
          },
        ],
      },
    });
    expect(games[0]?.lastPlayed).toBeNull();
  });

  it("has no last played date when Steam omits the field", () => {
    const games = mapGames({
      response: {
        games: [
          {
            appid: 440,
            name: "Team Fortress 2",
            playtime_forever: 405,
            img_icon_url: "abc123",
          },
        ],
      },
    });
    expect(games[0]?.lastPlayed).toBeNull();
  });
});

describe("mapGameProgress (nominal)", () => {
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
    const result = mapGameProgress(schema, player);
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
    const result = mapGameProgress(schema, player);
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.timeline).toHaveLength(1);
    expect(result.value.timeline[0]?.achievement.apiName).toBe("BOSS_1");
  });
});

describe("mapGameProgress (errors)", () => {
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
    expect(mapGameProgress(validSchema, player)).toEqual({
      ok: false,
      error: "PRIVATE_PROFILE",
    });
  });

  it("returns NO_ACHIEVEMENTS when the app has no stats", () => {
    const player: SteamPlayerAchievementsResponse = {
      playerstats: { success: false, error: "Requested app has no stats" },
    };
    expect(mapGameProgress(emptySchema, player)).toEqual({
      ok: false,
      error: "NO_ACHIEVEMENTS",
    });
  });

  it("returns NO_ACHIEVEMENTS when the schema has no achievements", () => {
    const player: SteamPlayerAchievementsResponse = {
      playerstats: { success: true, achievements: [] },
    };
    expect(mapGameProgress(emptySchema, player)).toEqual({
      ok: false,
      error: "NO_ACHIEVEMENTS",
    });
  });
});

describe("mapGameTally", () => {
  /**
   * Steam answers the player call with the game's whole achievement list, each
   * entry carrying whether this player has it. Counting therefore needs this
   * response and nothing else — the schema only adds names and icons, which a
   * tally has no use for.
   */
  const playerWith = (
    achieved: readonly number[],
    unlockTimes: readonly number[] = [],
  ): SteamPlayerAchievementsResponse => ({
    playerstats: {
      success: true,
      achievements: achieved.map((flag, index) => ({
        apiname: `ACH_${index}`,
        achieved: flag,
        unlocktime: flag === 1 ? (unlockTimes[index] ?? 1697568656) : 0,
      })),
    },
  });

  it("counts the achievements this player has earned", () => {
    const result = mapGameTally(playerWith([1, 0, 1, 0, 1]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.completion.unlocked).toBe(3);
      expect(result.value.completion.total).toBe(5);
      expect(result.value.completion.rate.percentage).toBe(60);
    }
  });

  it("reports a game the player has finished as complete", () => {
    const result = mapGameTally(playerWith([1, 1]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.completion).toMatchObject({ unlocked: 2, total: 2 });
      expect(result.value.completion.rate.percentage).toBe(100);
    }
  });

  it("reports a game the player has never scored in as zero of its real total", () => {
    const result = mapGameTally(playerWith([0, 0, 0, 0]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.completion).toMatchObject({ unlocked: 0, total: 4 });
      expect(result.value.completion.rate.percentage).toBe(0);
    }
  });

  /**
   * The dates are what tells a calendar when a player was unlocking, and the
   * names are what lets a ranking say which unlock is the rare one. Steam sends
   * both in whatever order it defines the achievements in, so the order is
   * imposed here rather than left to every reader to impose again.
   */
  it("names each unlock and dates it, earliest first", () => {
    const result = mapGameTally(playerWith([1, 1, 1], [300, 100, 200]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.unlocks).toEqual([
        { apiName: "ACH_1", at: 100 },
        { apiName: "ACH_2", at: 200 },
        { apiName: "ACH_0", at: 300 },
      ]);
    }
  });

  it("leaves out an achievement the player has not earned", () => {
    const result = mapGameTally(playerWith([1, 0, 1], [100, 0, 200]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.unlocks).toEqual([
        { apiName: "ACH_0", at: 100 },
        { apiName: "ACH_2", at: 200 },
      ]);
    }
  });

  /**
   * Steam does occasionally flag an achievement earned and date it at the
   * epoch, which is it saying it does not know when. The player has it, so it
   * is carried like any other unlock — with no date rather than an invented
   * one, and last, since a day it never happened on would sort it wrongly
   * against the ones that did (ADR-0009).
   */
  it("carries an earned achievement Steam dates at the epoch, with no date", () => {
    const result = mapGameTally(playerWith([1, 1], [0, 200]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.completion.unlocked).toBe(2);
      expect(result.value.unlocks).toEqual([
        { apiName: "ACH_1", at: 200 },
        { apiName: "ACH_0", at: null },
      ]);
    }
  });

  /**
   * One entry per unlock counted, always. ADR-0006 allowed the tally and its
   * dates to disagree, because an undated unlock had nowhere to go; it now has
   * one, and a reader that finds fewer unlocks than the tally counts is
   * reading a bug.
   */
  it("carries exactly as many unlocks as the tally counts", () => {
    const result = mapGameTally(playerWith([1, 1, 0, 1], [0, 200, 0, 100]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.unlocks).toHaveLength(result.value.completion.unlocked);
    }
  });

  it("returns PRIVATE_PROFILE when the player stats are not public", () => {
    expect(
      mapGameTally({
        playerstats: { success: false, error: "Profile is not public" },
      }),
    ).toEqual({ ok: false, error: "PRIVATE_PROFILE" });
  });

  it("returns NO_ACHIEVEMENTS when the app has no stats", () => {
    expect(
      mapGameTally({
        playerstats: { success: false, error: "Requested app has no stats" },
      }),
    ).toEqual({ ok: false, error: "NO_ACHIEVEMENTS" });
  });

  it("returns NO_ACHIEVEMENTS when the game defines none", () => {
    expect(mapGameTally({ playerstats: { success: true, achievements: [] } })).toEqual({
      ok: false,
      error: "NO_ACHIEVEMENTS",
    });
  });
});

/**
 * Rarity belongs to the Game, never to whoever is asking: nothing here takes a
 * player, and nothing here can tell two players apart.
 */
describe("mapGameRarity", () => {
  const published = (
    achievements: readonly SteamGlobalAchievementPercentage[],
  ): SteamGlobalAchievementPercentagesResponse => ({
    achievementpercentages: { achievements: [...achievements] },
  });

  it("maps each published share to the achievement it belongs to", () => {
    // Steam sends these as strings: `"percent":"48.7"`, measured on 2066020.
    const raw = published([
      { name: "ACH_BOSS_1", percent: "48.7" },
      { name: "ACH_BOSS_2", percent: "0.4" },
    ]);

    expect(mapGameRarity(raw)).toEqual([
      { apiName: "ACH_BOSS_1", rarity: 48.7 },
      { apiName: "ACH_BOSS_2", rarity: 0.4 },
    ]);
  });
  /**
   * The rule ADR-0008 rests on: nothing published is answered as nothing, and
   * never as a set of zeroes, which would rank every one of them the rarest
   * thing the player owns.
   */
  it("publishes nothing for a game Steam publishes nothing for", () => {
    // Measured: a 403 with a bare `{}`, not an envelope holding an empty list.
    expect(mapGameRarity({})).toEqual([]);
    expect(mapGameRarity({ achievementpercentages: {} })).toEqual([]);
    expect(mapGameRarity(published([]))).toEqual([]);
  });

  /**
   * The rule with teeth now that the figure arrives as text: anything that does
   * not parse is left out, never handed on as the zero `Number("")` gives —
   * which would rank it the rarest thing the player owns.
   */
  it("leaves out a figure it cannot read, rather than calling it zero", () => {
    const raw = published([
      { name: "ACH_GOOD", percent: "1.5" },
      { name: "ACH_EMPTY", percent: "" },
      { name: "ACH_JUNK", percent: "n/a" },
    ]);

    expect(mapGameRarity(raw)).toEqual([{ apiName: "ACH_GOOD", rarity: 1.5 }]);
  });

  /** A published zero is a figure Steam measured, and it stays. */
  it("keeps a published zero", () => {
    expect(mapGameRarity(published([{ name: "ACH_0", percent: "0" }]))).toEqual([
      { apiName: "ACH_0", rarity: 0 },
    ]);
  });

  /**
   * Steam rounds, so two Achievements really can be published exactly equal.
   * Downstream cuts a top ten on these figures and has to see the tie to
   * extend past it, so nothing here may nudge them apart.
   */
  it("leaves two equally published shares exactly equal", () => {
    const raw = published([
      { name: "ACH_A", percent: "12.3" },
      { name: "ACH_B", percent: "12.3" },
    ]);

    const [first, second] = mapGameRarity(raw);

    expect(first?.rarity).toBe(second?.rarity);
  });
});
