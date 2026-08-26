import type { GameCompletionDto, GameDto } from "@steam/contracts";

import {
  buildLibraryRows,
  buildLibrarySummary,
  formatDay,
  formatHours,
  type LibrarySort,
  type CompletionByAppId,
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

const completion = (unlocked: number, total: number): GameCompletionDto => ({
  unlocked,
  total,
  percentage: total === 0 ? 0 : (unlocked / total) * 100,
});

const SOULSTONE = game(2066020, "Soulstone Survivors", 4977, "2026-06-25T12:16:14.000Z");
const HALLS = game(2218750, "Halls of Torment", 14286, "2025-03-06T10:00:00.000Z");
const CIV5 = game(8930, "Sid Meier's Civilization V", 38496, "2017-08-24T10:00:00.000Z");
const KEEPERS = game(978520, "Legend of Keepers", 0, null);

const GAMES = [SOULSTONE, HALLS, CIV5, KEEPERS] as const;
const COMPLETIONS: CompletionByAppId = {
  2066020: completion(353, 483),
  2218750: completion(500, 500),
  978520: completion(0, 24),
};

/** Nothing outstanding and nothing pinned: the settled view, after a load. */
const settled = (
  sort: LibrarySort,
  completions: CompletionByAppId = COMPLETIONS,
  games: readonly GameDto[] = GAMES,
) => ({ games, completions, sort, pending: new Set<number>(), frozenOrder: null });

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
  it("shows completion for a game whose tally arrived", () => {
    const row = buildLibraryRows(settled("completed")).find((r) => r.appId === 2066020);

    expect(row?.rateLabel).toBe("73%");
    expect(row?.percentage).toBe(73);
    expect(row?.meta).toContain("353/483");
  });

  it("shows a dash for a game whose tally was never asked for", () => {
    const row = buildLibraryRows(settled("completed")).find((r) => r.appId === 8930);

    expect(row?.rateLabel).toBe("—");
    expect(row?.percentage).toBeNull();
  });

  it("says so when a game defines no achievements", () => {
    const rows = buildLibraryRows(settled("completed", { 8930: completion(0, 0) }));
    expect(rows.find((r) => r.appId === 8930)?.meta).toContain("no achievements");
  });

  it("shows a dash, not 0 %, for a game that defines no achievements", () => {
    const row = buildLibraryRows(
      settled("completed", { 8930: completion(0, 0) }),
    ).find((r) => r.appId === 8930);

    expect(row?.rateLabel).toBe("—");
    expect(row?.percentage).toBeNull();
  });

  it("says so when a game was never launched", () => {
    const rows = buildLibraryRows(settled("completed"));
    expect(rows.find((r) => r.appId === 978520)?.meta).toContain("never played");
  });

  it("leaves the games it was given untouched", () => {
    const order = GAMES.map((g) => g.appId);
    buildLibraryRows(settled("playtime"));
    expect(GAMES.map((g) => g.appId)).toEqual(order);
  });
});

/**
 * Finishing a game is the thing the app is about, so the default order leads
 * with the games the player has finished — and among those, with the ones that
 * asked the most, because 500 of 500 is not the same feat as 5 of 5.
 */
describe("buildLibraryRows, ordered by what the player has finished", () => {
  const ROGUE = game(1, "Small but perfect", 100, "2026-01-01T00:00:00.000Z");
  const EPIC = game(2, "Large and perfect", 100, "2026-01-01T00:00:00.000Z");
  const NEARLY = game(3, "Nearly there", 100, "2026-01-01T00:00:00.000Z");
  const BARELY = game(4, "Barely started", 100, "2026-01-01T00:00:00.000Z");
  const NOTHING = game(5, "Nothing to earn", 100, "2026-01-01T00:00:00.000Z");
  const UNASKED = game(6, "Never asked", 100, "2026-01-01T00:00:00.000Z");

  const games = [BARELY, UNASKED, ROGUE, NOTHING, EPIC, NEARLY] as const;
  const completions: CompletionByAppId = {
    1: completion(10, 10),
    2: completion(400, 400),
    3: completion(90, 100),
    4: completion(2, 100),
    5: completion(0, 0),
  };

  const ordered = () =>
    buildLibraryRows(settled("completed", completions, games)).map((r) => r.appId);

  it("puts a finished game ahead of an unfinished one, however close", () => {
    expect(ordered().indexOf(1)).toBeLessThan(ordered().indexOf(3));
  });

  it("leads with the richest of the finished games", () => {
    expect(ordered().slice(0, 2)).toEqual([2, 1]);
  });

  it("orders the unfinished by how far along they are", () => {
    expect(ordered().slice(2, 4)).toEqual([3, 4]);
  });

  it("sinks a game with nothing to earn, and one never asked about, to the bottom", () => {
    expect(ordered().slice(4)).toEqual(expect.arrayContaining([5, 6]));
  });
});

describe("buildLibraryRows, other orders", () => {
  it("sorts the most recently played first, never played last", () => {
    const rows = buildLibraryRows(settled("recent"));
    expect(rows.map((r) => r.appId)).toEqual([2066020, 2218750, 8930, 978520]);
  });

  it("sorts the most played first", () => {
    const rows = buildLibraryRows(settled("playtime"));
    expect(rows.map((r) => r.appId)).toEqual([8930, 2218750, 2066020, 978520]);
  });
});

/**
 * Tallies arrive in waves across a whole library, and the chosen order depends
 * on them. Re-sorting on every wave would move rows under the reader's finger,
 * so while a load runs the order it started with is the order it keeps.
 */
describe("buildLibraryRows, while tallies are still arriving", () => {
  const loading = (completions: CompletionByAppId, pending: readonly number[]) => ({
    games: GAMES,
    completions,
    sort: "completed" as const,
    pending: new Set(pending),
    frozenOrder: [8930, 978520, 2066020, 2218750],
  });

  it("keeps the order it was pinned to, whatever the tallies say", () => {
    const rows = buildLibraryRows(loading(COMPLETIONS, []));
    expect(rows.map((r) => r.appId)).toEqual([8930, 978520, 2066020, 2218750]);
  });

  it("still shows every game, including one the pinned order does not name", () => {
    const rows = buildLibraryRows({
      ...loading(COMPLETIONS, []),
      frozenOrder: [2066020],
    });
    expect(rows).toHaveLength(GAMES.length);
    expect(rows[0]?.appId).toBe(2066020);
  });

  it("marks a game still waiting for its tally as pending", () => {
    const rows = buildLibraryRows(loading({}, [2066020]));
    expect(rows.find((r) => r.appId === 2066020)?.pending).toBe(true);
  });

  it("does not mark a game whose tally has landed", () => {
    const rows = buildLibraryRows(loading(COMPLETIONS, [8930]));
    expect(rows.find((r) => r.appId === 2066020)?.pending).toBe(false);
  });

  /**
   * A game nobody is asking about draws a dash, and a game being asked about
   * draws a skeleton. Telling them apart is the whole point of the flag.
   */
  it("does not mark a game nothing is being asked about", () => {
    const rows = buildLibraryRows(loading({}, [2066020]));
    expect(rows.find((r) => r.appId === 8930)?.pending).toBe(false);
  });
});

describe("buildLibrarySummary", () => {
  // The chosen order has no bearing on a summary; any settled view will do.
  const summary = buildLibrarySummary(settled("completed"));

  it("counts unlocked achievements across the games it has data for", () => {
    expect(summary.unlocked).toBe(853);
    expect(summary.total).toBe(1007);
  });

  it("rounds the library completion rate", () => {
    expect(summary.rateLabel).toBe("85%");
  });

  it("names what it measured, without implying the rest is missing", () => {
    expect(summary.fraction).toBe("853 / 1007 across 3 games counted");
  });

  it("counts a fully completed game as perfect", () => {
    expect(summary.perfectGames).toBe(1);
  });

  it("totals playtime over the whole library, not just loaded games", () => {
    expect(summary.playtimeLabel).toBe(formatHours(4977 + 14286 + 38496 + 0));
  });
});
