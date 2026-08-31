import type { AchievementDto, GameDto, GameProgressDto } from "@steam/contracts";

import {
  buildAchievementRows,
  buildFilterCounts,
  buildGameSummary,
  buildTimelineDays,
  gameInLibrary,
} from "./game-progress";

const achievement = (
  apiName: string,
  displayName: string,
  unlockedAt: string | null,
  description = "",
): AchievementDto => ({
  apiName,
  displayName,
  description,
  hidden: false,
  icon: `https://icon/${apiName}.jpg`,
  iconGray: `https://gray/${apiName}.jpg`,
  unlocked: unlockedAt !== null,
  unlockedAt,
});

const ACHIEVEMENTS: readonly AchievementDto[] = [
  achievement("BOSS_1", "First boss", "2026-06-24T22:09:00.000Z", "Beat it."),
  achievement("BOSS_2", "Second boss", "2026-06-24T20:08:00.000Z", "Beat it again."),
  achievement("BOSS_3", "Third boss", "2025-11-26T22:45:00.000Z"),
  achievement("SECRET", "Secret", null, "Hidden away."),
];

const PROGRESS: GameProgressDto = {
  completion: { unlocked: 3, total: 4, percentage: 75 },
  achievements: ACHIEVEMENTS,
  timeline: [
    { apiName: "BOSS_3", unlockedAt: "2025-11-26T22:45:00.000Z" },
    { apiName: "BOSS_2", unlockedAt: "2026-06-24T20:08:00.000Z" },
    { apiName: "BOSS_1", unlockedAt: "2026-06-24T22:09:00.000Z" },
  ],
};

const GAME: GameDto = {
  appId: 2066020,
  name: "Soulstone Survivors",
  playtimeMinutes: 4977,
  playtimeLabel: "82 h 57",
  iconUrl: "https://icon/2066020.jpg",
  lastPlayedAt: "2026-06-25T12:16:14.000Z",
};

const EMPTY: GameProgressDto = {
  completion: { unlocked: 0, total: 0, percentage: 0 },
  achievements: [],
  timeline: [],
};

describe("buildFilterCounts", () => {
  it("counts each bucket", () => {
    expect(buildFilterCounts(PROGRESS)).toEqual({ all: 4, unlocked: 3, locked: 1 });
  });
});

describe("buildAchievementRows", () => {
  it("keeps every achievement under the all filter", () => {
    expect(buildAchievementRows(PROGRESS, "all")).toHaveLength(4);
  });

  it("keeps only unlocked ones under the unlocked filter", () => {
    const rows = buildAchievementRows(PROGRESS, "unlocked");
    expect(rows.map((r) => r.apiName)).toEqual(["BOSS_1", "BOSS_2", "BOSS_3"]);
  });

  it("keeps only locked ones under the locked filter", () => {
    expect(buildAchievementRows(PROGRESS, "locked").map((r) => r.apiName)).toEqual([
      "SECRET",
    ]);
  });

  it("shows the unlock date of an earned achievement", () => {
    const row = buildAchievementRows(PROGRESS, "all")[0];
    expect(row?.dateLabel).toBe("24 Jun 2026");
  });

  it("says locked instead of a date when it was never earned", () => {
    expect(buildAchievementRows(PROGRESS, "locked")[0]?.dateLabel).toBe("locked");
  });

  it("uses the colour icon once earned and the grey one before", () => {
    expect(buildAchievementRows(PROGRESS, "unlocked")[0]?.iconUrl).toContain("icon/");
    expect(buildAchievementRows(PROGRESS, "locked")[0]?.iconUrl).toContain("gray/");
  });

  it("stands in for a missing description", () => {
    expect(buildAchievementRows(PROGRESS, "all")[2]?.description).toBe(
      "Hidden achievement — no description",
    );
  });

  it("shows the most recently earned first", () => {
    expect(buildAchievementRows(PROGRESS, "all").map((r) => r.apiName)).toEqual([
      "BOSS_1",
      "BOSS_2",
      "BOSS_3",
      "SECRET",
    ]);
  });
});

describe("buildTimelineDays", () => {
  const days = buildTimelineDays(PROGRESS);

  it("groups unlocks by the day they happened, newest first", () => {
    expect(days.map((d) => d.day)).toEqual(["24 Jun", "26 Nov"]);
    expect(days.map((d) => d.year)).toEqual(["2026", "2025"]);
  });

  it("counts what was earned that day", () => {
    expect(days[0]?.countLabel).toBe("2 unlocked");
    expect(days[1]?.countLabel).toBe("1 unlocked");
  });

  it("orders a day's unlocks newest first and stamps the time", () => {
    expect(days[0]?.items.map((i) => i.name)).toEqual(["First boss", "Second boss"]);
    expect(days[0]?.items[0]?.timeLabel).toBe("22:09");
  });

  it("has nothing to show for a game with no unlocks", () => {
    expect(buildTimelineDays(EMPTY)).toEqual([]);
  });
});

describe("buildGameSummary", () => {
  const summary = buildGameSummary(GAME, PROGRESS);

  it("reads the fraction as the mock writes it", () => {
    expect(summary.fraction).toBe("3 / 4");
    expect(summary.rateLabel).toBe("75%");
  });

  it("says how many are left", () => {
    expect(summary.remaining).toBe("1 achievement remaining");
  });

  it("says when the last unlock happened", () => {
    expect(summary.lastUnlock).toBe("last unlock 24 Jun 2026");
  });

  it("describes playtime and last session", () => {
    expect(summary.meta).toBe("82 h 57 played · last played 25 Jun 2026");
  });

  it("has no rate and nothing remaining for a game with no achievements", () => {
    const none = buildGameSummary(GAME, EMPTY);
    expect(none.percentage).toBeNull();
    expect(none.rateLabel).toBe("—");
    expect(none.fraction).toBe("no achievements");
    expect(none.remaining).toBe("");
  });

  it("tells apart a game with nothing to earn from one never fetched", () => {
    const unfetched = buildGameSummary(GAME, null);
    expect(unfetched.percentage).toBeNull();
    expect(unfetched.fraction).toBe("not loaded");
  });

  /**
   * Steam does not always send a last-played time, and "last played never"
   * beside 82 hours is untrue. Where it withholds the date the line says only
   * what is known; only a game with no playtime either was really never opened.
   */
  it("says only what is known where Steam sent no date", () => {
    const undated = buildGameSummary({ ...GAME, lastPlayedAt: null }, null);

    expect(undated.meta).toBe("82 h 57 played");
  });

  it("still says never for a game with no playtime either", () => {
    const untouched = buildGameSummary(
      { ...GAME, lastPlayedAt: null, playtimeMinutes: 0, playtimeLabel: "0 min" },
      null,
    );

    expect(untouched.meta).toBe("0 min played · last played never");
  });

  it("still describes playtime for a game never fetched", () => {
    expect(buildGameSummary(GAME, null).meta).toBe(
      "82 h 57 played · last played 25 Jun 2026",
    );
  });
});

describe("gameInLibrary", () => {
  const owned = (appId: number): GameDto => ({
    appId,
    name: `Game ${appId}`,
    playtimeMinutes: 10,
    playtimeLabel: "10 min",
    iconUrl: `https://icon/${appId}.jpg`,
    lastPlayedAt: null,
  });

  const LIBRARY = [owned(2066020), owned(440)] as const;

  it("finds the game the player was asking for", () => {
    expect(gameInLibrary(LIBRARY, 440)).toEqual(owned(440));
  });

  /**
   * The one that matters (ADR-0004). The API would answer 200 with an empty
   * progress for this appId, which is indistinguishable from a game that
   * defines no achievements — so a stale link would read as "nothing to earn"
   * unless it is refused right here.
   */
  it("refuses a game the player does not own", () => {
    expect(gameInLibrary(LIBRARY, 999999)).toBeNull();
  });

  it("refuses anything at all against an empty library", () => {
    expect(gameInLibrary([], 440)).toBeNull();
  });
});
