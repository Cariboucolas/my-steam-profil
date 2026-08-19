import type { GameDto, GameProgressDto } from "@steam/contracts";

import {
  buildLibraryRows,
  buildLibrarySummary,
  formatDay,
  formatHours,
} from "./library";

const game = (
  appId: number,
  name: string,
  playtimeMinutes: number,
  lastPlayedAt: string | null,
): GameDto => ({
  appId,
  name,
  playtimeMinutes,
  playtimeLabel: `${playtimeMinutes} min`,
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt,
});

const progress = (unlocked: number, total: number): GameProgressDto => ({
  completion: {
    unlocked,
    total,
    percentage: total === 0 ? 0 : (unlocked / total) * 100,
  },
  achievements: [],
  timeline: [],
});

const SOULSTONE = game(2066020, "Soulstone Survivors", 4977, "2026-06-25T12:16:14.000Z");
const HALLS = game(2218750, "Halls of Torment", 14286, "2025-03-06T10:00:00.000Z");
const CIV5 = game(8930, "Sid Meier's Civilization V", 38496, "2017-08-24T10:00:00.000Z");
const KEEPERS = game(978520, "Legend of Keepers", 0, null);

const GAMES = [SOULSTONE, HALLS, CIV5, KEEPERS] as const;
const PROGRESS = {
  2066020: progress(353, 483),
  2218750: progress(500, 500),
  978520: progress(0, 24),
};

describe("formatHours", () => {
  it("groups thousands with a space, as the mock does", () => {
    expect(formatHours(187_680)).toBe("3 128 h");
  });

  it("stays in minutes below an hour", () => {
    expect(formatHours(45)).toBe("45 min");
  });

  it("reads zero as no playtime at all", () => {
    expect(formatHours(0)).toBe("0 min");
  });
});

describe("formatDay", () => {
  it("writes a short English date", () => {
    expect(formatDay("2026-06-25T12:16:14.000Z")).toBe("25 Jun 2026");
  });
});

describe("buildLibraryRows", () => {
  it("shows completion for a game whose progress was loaded", () => {
    const rows = buildLibraryRows(GAMES, PROGRESS, "closest");
    const row = rows.find((r) => r.appId === 2066020);
    expect(row?.rateLabel).toBe("73%");
    expect(row?.percentage).toBe(73);
    expect(row?.meta).toContain("353/483");
  });

  it("shows a dash for a game whose progress was never loaded", () => {
    const rows = buildLibraryRows(GAMES, PROGRESS, "closest");
    const row = rows.find((r) => r.appId === 8930);
    expect(row?.rateLabel).toBe("—");
    expect(row?.percentage).toBeNull();
  });

  it("says so when a game defines no achievements", () => {
    const rows = buildLibraryRows(GAMES, { 8930: progress(0, 0) }, "closest");
    expect(rows.find((r) => r.appId === 8930)?.meta).toContain("no achievements");
  });

  it("says so when a game was never launched", () => {
    const rows = buildLibraryRows(GAMES, PROGRESS, "closest");
    expect(rows.find((r) => r.appId === 978520)?.meta).toContain("never played");
  });

  it("sorts the closest to 100 % first, unknown completion last", () => {
    const rows = buildLibraryRows(GAMES, PROGRESS, "closest");
    expect(rows.map((r) => r.appId)).toEqual([2218750, 2066020, 978520, 8930]);
  });

  it("sorts the most recently played first, never played last", () => {
    const rows = buildLibraryRows(GAMES, PROGRESS, "recent");
    expect(rows.map((r) => r.appId)).toEqual([2066020, 2218750, 8930, 978520]);
  });

  it("sorts the most played first", () => {
    const rows = buildLibraryRows(GAMES, PROGRESS, "playtime");
    expect(rows.map((r) => r.appId)).toEqual([8930, 2218750, 2066020, 978520]);
  });

  it("leaves the games it was given untouched", () => {
    const order = GAMES.map((g) => g.appId);
    buildLibraryRows(GAMES, PROGRESS, "playtime");
    expect(GAMES.map((g) => g.appId)).toEqual(order);
  });
});

describe("buildLibrarySummary", () => {
  const summary = buildLibrarySummary(GAMES, PROGRESS);

  it("counts unlocked achievements across the games it has data for", () => {
    expect(summary.unlocked).toBe(853);
    expect(summary.total).toBe(1007);
  });

  it("rounds the library completion rate", () => {
    expect(summary.rateLabel).toBe("85%");
  });

  it("admits how much of the library it actually measured", () => {
    expect(summary.fraction).toBe("853 / 1007 across 3 of 4 games loaded");
  });

  it("counts a fully completed game as perfect", () => {
    expect(summary.perfectGames).toBe(1);
  });

  it("totals playtime over the whole library, not just loaded games", () => {
    expect(summary.playtimeLabel).toBe(formatHours(4977 + 14286 + 38496 + 0));
  });
});
