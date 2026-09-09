import type {
  AchievementNamesDto,
  GameDto,
  GameRarityDto,
  UnlockDto,
} from "@steam/contracts";

import type { LibraryView } from "./library";
import {
  buildRarestUnlocks,
  gamesShownIn,
  nameUnlocks,
  type RarityByAppId,
  type RarestUnlocks,
} from "./rarest-unlocks";

const SOULSTONE = 2066020;
const HALLS = 2218750;
const EXILE = 2694490;

const NAMES: Readonly<Record<number, string>> = {
  [SOULSTONE]: "Soulstone Survivors",
  [HALLS]: "Halls of Torment",
  [EXILE]: "Path of Exile",
};

const game = (appId: number): GameDto => ({
  appId,
  name: NAMES[appId] ?? `Game ${appId}`,
  playtimeMinutes: 120,
  playtimeLabel: "2 h",
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt: null,
});

/** Epoch seconds, written as a day so a fixture reads as one. */
const at = (iso: string): number => Date.parse(iso) / 1000;

/**
 * What one game holds: the achievements the player unlocked, each with the day
 * it fell on, and what Steam publishes about that game's achievements.
 *
 * The two are written apart because that is how they arrive — the unlocks with
 * the tally, the figures from a route that knows no player — and every rule
 * here is about what happens where the two do not line up.
 */
type Held = {
  readonly unlocked?: Readonly<Record<string, string | null>>;
  readonly published?: Readonly<Record<string, number>>;
};

const unlocksOf = (held: Held): readonly UnlockDto[] =>
  Object.entries(held.unlocked ?? {}).map(([apiName, day]) => ({
    apiName,
    at: day === null ? null : at(day),
  }));

const publishedOf = (held: Held): GameRarityDto | undefined =>
  held.published &&
  Object.entries(held.published).map(([apiName, rarity]) => ({
    apiName,
    rarity,
  }));

/**
 * A counted library and the rarity that came back for it. A game named without
 * `published` is one Steam publishes nothing about; a game absent from the
 * rarity altogether is one that was never asked about.
 */
const libraryHolding = (
  held: Readonly<Record<number, Held>>,
): { view: LibraryView; rarity: RarityByAppId } => {
  const appIds = Object.keys(held).map(Number);

  return {
    view: {
      games: appIds.map(game),
      tallies: Object.fromEntries(
        appIds.map((appId) => {
          const unlocks = unlocksOf(held[appId] ?? {});
          return [
            appId,
            {
              completion: {
                unlocked: unlocks.length,
                total: 100,
                percentage: unlocks.length,
              },
              unlocks,
            },
          ];
        }),
      ),
      sort: "completed",
      pending: new Set<number>(),
      frozenOrder: null,
    },
    rarity: Object.fromEntries(
      appIds
        .map((appId) => [appId, publishedOf(held[appId] ?? {})] as const)
        .filter((entry): entry is readonly [number, GameRarityDto] =>
          entry[1] !== undefined,
        ),
    ),
  };
};

const rank = (held: Readonly<Record<number, Held>>): RarestUnlocks => {
  const { view, rarity } = libraryHolding(held);
  return buildRarestUnlocks(view, rarity);
};

/** The achievements a ranking named, rarest first. */
const named = (ranking: RarestUnlocks): readonly string[] =>
  ranking.rows.map((row) => row.apiName);

/** `count` achievements of one game, all published at the same figure. */
const tiedAt = (
  rarity: number,
  count: number,
  prefix: string,
): { unlocked: Record<string, string>; published: Record<string, number> } => {
  const unlocked: Record<string, string> = {};
  const published: Record<string, number> = {};
  for (let index = 0; index < count; index += 1) {
    unlocked[`${prefix}_${index}`] = "2026-01-01T00:00:00Z";
    published[`${prefix}_${index}`] = rarity;
  }
  return { unlocked, published };
};

describe("buildRarestUnlocks", () => {
  it("puts the rarest unlock first", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { COMMON: "2026-01-01T00:00:00Z", RARE: "2026-01-01T00:00:00Z" },
        published: { COMMON: 42.5, RARE: 0.4 },
      },
      [HALLS]: {
        unlocked: { MIDDLING: "2026-01-01T00:00:00Z" },
        published: { MIDDLING: 12 },
      },
    });

    expect(named(ranking)).toEqual(["RARE", "MIDDLING", "COMMON"]);
  });

  it("says which game each unlock came from, and how rare it is", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { RARE: "2026-01-01T00:00:00Z" },
        published: { RARE: 0.4 },
      },
    });

    expect(ranking.rows[0]).toEqual({
      appId: SOULSTONE,
      gameName: "Soulstone Survivors",
      apiName: "RARE",
      rarity: 0.4,
      rarityLabel: "0.4%",
    });
  });

  /**
   * Steam publishes a figure it has already rounded, and rounding it again
   * invents nothing. A whole number keeps no decimal, as every other rate on
   * this screen is written.
   */
  it("writes the figure as the row shows it", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { A: null, B: null, C: null },
        published: { A: 0.44444, B: 12, C: 0.02 },
      },
    });

    expect(ranking.rows.map((row) => row.rarityLabel)).toEqual([
      // Rarer than a tenth of a percent, and saying "0%" of something the
      // player is holding would be a plain untruth.
      "<0.1%",
      "0.4%",
      "12%",
    ]);
  });

  it("keeps ten rows out of a library holding more", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: Object.fromEntries(
          Array.from({ length: 30 }, (_, index) => [
            `ACH_${index}`,
            "2026-01-01T00:00:00Z",
          ]),
        ),
        published: Object.fromEntries(
          Array.from({ length: 30 }, (_, index) => [`ACH_${index}`, index + 1]),
        ),
      },
    });

    expect(ranking.rows).toHaveLength(10);
    expect(named(ranking)[9]).toBe("ACH_9");
  });

  /**
   * Steam rounds, so the tenth and the eleventh can be published at exactly the
   * same figure. Cutting between two equal values is the one place this
   * ranking can mislead without anyone noticing, so it does not cut there.
   */
  it("keeps everything published at the same figure as the tenth", () => {
    const tie = tiedAt(5, 4, "TIED");
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: {
          ...Object.fromEntries(
            Array.from({ length: 8 }, (_, index) => [
              `RARER_${index}`,
              "2026-01-01T00:00:00Z",
            ]),
          ),
          ...tie.unlocked,
        },
        published: {
          ...Object.fromEntries(
            Array.from({ length: 8 }, (_, index) => [
              `RARER_${index}`,
              (index + 1) / 10,
            ]),
          ),
          ...tie.published,
        },
      },
      [HALLS]: {
        unlocked: { COMMONER: "2026-01-01T00:00:00Z" },
        published: { COMMONER: 6 },
      },
    });

    // Eight rarer than the tie, then all four of it: twelve rows, and the
    // commoner one still left out.
    expect(ranking.rows).toHaveLength(12);
    expect(named(ranking)).not.toContain("COMMONER");
  });

  /**
   * Two rows a reader sees as `0.4%` are two rows a reader sees as equal, and
   * cutting between them is the very thing the tie rule exists to stop —
   * whatever the figure behind the label happens to carry.
   */
  it("keeps a row the tenth only differs from below what is shown", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: {
          ...Object.fromEntries(
            Array.from({ length: 9 }, (_, index) => [
              `RARER_${index}`,
              "2026-01-01T00:00:00Z",
            ]),
          ),
          TENTH: "2026-01-01T00:00:00Z",
          ELEVENTH: "2026-01-01T00:00:00Z",
        },
        published: {
          // Nine rarer, each shown as its own figure: 0.5%, 1%, 1.5% …
          ...Object.fromEntries(
            Array.from({ length: 9 }, (_, index) => [
              `RARER_${index}`,
              (index + 1) / 2,
            ]),
          ),
          // Both shown as 5%, and apart only where nobody can see.
          TENTH: 5,
          ELEVENTH: 5.0001,
        },
      },
    });

    expect(ranking.rows).toHaveLength(11);
    expect(named(ranking)).toContain("ELEVENTH");
  });

  it("puts the newest of two equally rare unlocks first", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: {
          OLDER: "2024-03-02T10:00:00Z",
          NEWER: "2026-03-02T10:00:00Z",
          MIDDLE: "2025-03-02T10:00:00Z",
        },
        published: { OLDER: 0.4, NEWER: 0.4, MIDDLE: 0.4 },
      },
    });

    expect(named(ranking)).toEqual(["NEWER", "MIDDLE", "OLDER"]);
  });

  /**
   * An unlock Steam will not date is a real unlock (ADR-0009). It ranks on its
   * rarity like any other and simply has nothing to break a tie with, so it
   * follows the ones that can be placed in time rather than leading them.
   */
  it("ranks an unlock Steam will not date, behind its dated equals", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { UNDATED: null, DATED: "2020-01-01T00:00:00Z" },
        published: { UNDATED: 0.4, DATED: 0.4 },
      },
    });

    expect(named(ranking)).toEqual(["DATED", "UNDATED"]);
  });

  it("never names an achievement the player has not unlocked", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { HELD: "2026-01-01T00:00:00Z" },
        published: { ALMOST_NOBODY_HAS_THIS: 0.1, HELD: 40 },
      },
    });

    expect(named(ranking)).toEqual(["HELD"]);
  });

  /**
   * Steam can publish figures for a game and say nothing about one of its
   * achievements. That unlock is dropped rather than given a zero, which would
   * rank it the rarest thing the player owns — the same line CONTEXT.md draws:
   * no figure at all is not a figure of zero.
   */
  it("leaves out an unlock Steam publishes no figure for", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { UNPUBLISHED: "2026-01-01T00:00:00Z", KNOWN: "2026-01-01T00:00:00Z" },
        published: { KNOWN: 40 },
      },
    });

    expect(named(ranking)).toEqual(["KNOWN"]);
  });

  /**
   * A game Steam publishes nothing about is left out rather than parked at the
   * bottom: the bottom is where the commonest unlocks are, and how common these
   * are is exactly what is not known.
   */
  it("leaves out a game whose rarity Steam does not publish", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { RARE: "2026-01-01T00:00:00Z" },
        published: { RARE: 0.4 },
      },
      [HALLS]: { unlocked: { UNKNOWN: "2026-01-01T00:00:00Z" }, published: {} },
      [EXILE]: { unlocked: { NEVER_ASKED: "2026-01-01T00:00:00Z" } },
    });

    expect(named(ranking)).toEqual(["RARE"]);
  });

  it("states how many games it ranked across", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { RARE: "2026-01-01T00:00:00Z" },
        published: { RARE: 0.4 },
      },
      [HALLS]: {
        unlocked: { OTHER: "2026-01-01T00:00:00Z" },
        published: { OTHER: 8 },
      },
      [EXILE]: { unlocked: { UNKNOWN: "2026-01-01T00:00:00Z" }, published: {} },
    });

    expect(ranking.countedLabel).toBe("rarest 2 across 2 games counted");
  });

  it("counts a game it could rank nothing in, having been told about it", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { RARE: "2026-01-01T00:00:00Z" },
        published: { RARE: 0.4 },
      },
      [HALLS]: { unlocked: {}, published: { NOT_HELD: 2 } },
    });

    expect(ranking.countedLabel).toBe("rarest 1 across 2 games counted");
  });

  it("ranks nothing rather than failing on a library holding no unlock", () => {
    const ranking = rank({
      [SOULSTONE]: { unlocked: {}, published: { NOT_HELD: 2 } },
    });

    expect(ranking.rows).toEqual([]);
    expect(ranking.countedLabel).toBe("nothing to rank across 1 game counted");
  });

  it("ranks nothing rather than failing on a library nothing is known about", () => {
    const ranking = rank({ [SOULSTONE]: { unlocked: {} } });

    expect(ranking.rows).toEqual([]);
    expect(ranking.countedLabel).toBe("nothing to rank across 0 games counted");
  });

  /**
   * A game the library no longer holds is not the player's to rank, exactly as
   * the summary beside it counts only what the library holds.
   */
  it("ranks only the games the library holds", () => {
    const { view, rarity } = libraryHolding({
      [SOULSTONE]: {
        unlocked: { RARE: "2026-01-01T00:00:00Z" },
        published: { RARE: 0.4 },
      },
      [HALLS]: {
        unlocked: { RARER: "2026-01-01T00:00:00Z" },
        published: { RARER: 0.1 },
      },
    });

    const ranking = buildRarestUnlocks(
      { ...view, games: view.games.filter((one) => one.appId === SOULSTONE) },
      rarity,
    );

    expect(named(ranking)).toEqual(["RARE"]);
  });

  /**
   * Two unlocks can be equal on the figure and on the day, and something still
   * has to be drawn first. The library's own order decides it, then the name —
   * so a rebuild of the same load draws the same list rather than whichever
   * order the answers happened to land in.
   */
  it("orders what nothing else separates by the game, then by the name", () => {
    const day = "2026-01-01T00:00:00Z";
    const ranking = rank({
      [HALLS]: {
        unlocked: { SECOND: day, FIRST: day },
        published: { SECOND: 0.4, FIRST: 0.4 },
      },
      [SOULSTONE]: { unlocked: { ALSO: day }, published: { ALSO: 0.4 } },
    });

    expect(named(ranking)).toEqual(["ALSO", "FIRST", "SECOND"]);
  });

  /**
   * Built over and over as the tab loads, and the same inputs must draw the
   * same pixels: nothing here reads a clock, and no two rows are left in an
   * order the input did not decide.
   */
  it("answers the same thing twice", () => {
    const held = {
      [SOULSTONE]: tiedAt(0.4, 6, "TIED"),
      [HALLS]: tiedAt(0.4, 6, "ALSO"),
    };

    expect(rank(held)).toEqual(rank(held));
  });
});

/**
 * Phase two, and the order it has to run in: a ranking is decided on figures
 * alone, and only once it exists is it known which three to six games are worth
 * the schema (ADR-0005). So the games shown are read off the rows.
 */
describe("gamesShownIn", () => {
  it("names each game the rows come from, once", () => {
    const ranking = rank({
      [SOULSTONE]: {
        unlocked: { BOSS_1: "2026-01-01T00:00:00Z", BOSS_2: "2026-01-02T00:00:00Z" },
        published: { BOSS_1: 0.4, BOSS_2: 1.2 },
      },
      [HALLS]: {
        unlocked: { HALL_1: "2026-01-03T00:00:00Z" },
        published: { HALL_1: 0.9 },
      },
    });

    // Three rows — BOSS_1, HALL_1, BOSS_2 — out of two games, so two calls.
    expect(ranking.rows).toHaveLength(3);
    expect(gamesShownIn(ranking.rows)).toEqual([SOULSTONE, HALLS]);
  });

  it("names nothing for a ranking with no rows in it", () => {
    expect(gamesShownIn([])).toEqual([]);
  });

  /**
   * The bound the whole phase rests on: the schema is asked for per row shown,
   * never per game owned (ADR-0005). A library of twenty games holding unlocks
   * still shows ten rows, so it is asked at most ten questions.
   */
  it("names at most as many games as there are rows, never a whole library", () => {
    const library = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [
        1000 + index,
        {
          unlocked: { [`ACH_${index}`]: "2026-01-01T00:00:00Z" },
          published: { [`ACH_${index}`]: index + 1 },
        },
      ]),
    );

    const ranking = rank(library);

    expect(Object.keys(library)).toHaveLength(20);
    expect(gamesShownIn(ranking.rows)).toHaveLength(ranking.rows.length);
    expect(gamesShownIn(ranking.rows).length).toBeLessThanOrEqual(10);
  });
});

/**
 * What the rows were ranked as, and what a reader is owed: an apiName is a key,
 * not a name. Nothing here reorders anything — the ranking was settled on
 * figures and dates, and a name cannot move a row.
 */
describe("nameUnlocks", () => {
  /** Every game behind these rows has answered, named or not. */
  const ANSWERED: ReadonlySet<number> = new Set();

  const RANKING = rank({
    [SOULSTONE]: {
      unlocked: { BOSS_1: "2026-01-01T00:00:00Z" },
      published: { BOSS_1: 0.4 },
    },
    [HALLS]: {
      unlocked: { HALL_1: "2026-01-03T00:00:00Z" },
      published: { HALL_1: 0.9 },
    },
  });

  const namesFor = (
    achievements: Readonly<Record<string, readonly [string, string]>>,
  ): AchievementNamesDto =>
    Object.entries(achievements).map(([apiName, [displayName, icon]]) => ({
      apiName,
      displayName,
      icon,
    }));

  it("gives each row the name and icon its game gives it", () => {
    const rows = nameUnlocks(RANKING.rows, {
      [SOULSTONE]: namesFor({ BOSS_1: ["Soulstone Slayer", "https://icon/boss1.jpg"] }),
      [HALLS]: namesFor({ HALL_1: ["Torment Endured", "https://icon/hall1.jpg"] }),
    }, ANSWERED);

    expect(rows).toEqual([
      expect.objectContaining({
        apiName: "BOSS_1",
        displayName: "Soulstone Slayer",
        icon: "https://icon/boss1.jpg",
        gameName: "Soulstone Survivors",
        rarityLabel: "0.4%",
      }),
      expect.objectContaining({
        apiName: "HALL_1",
        displayName: "Torment Endured",
        icon: "https://icon/hall1.jpg",
        gameName: "Halls of Torment",
      }),
    ]);
  });

  /**
   * The rule this whole step is bounded by: a row was ranked on a figure Steam
   * published, and no answer about its name can take it back off the list. The
   * key it was ranked under is a poor name and a true one.
   */
  it("keeps the apiName where the game names nothing for it", () => {
    const rows = nameUnlocks(RANKING.rows, {
      [SOULSTONE]: namesFor({ SOMETHING_ELSE: ["Another award", "https://icon/x.jpg"] }),
    }, ANSWERED);

    expect(rows[0]).toMatchObject({
      apiName: "BOSS_1",
      displayName: "BOSS_1",
      icon: null,
    });
  });

  /** A game still being asked about, or one that failed: the same row, unnamed. */
  it("keeps every row while no game has been asked about yet", () => {
    const rows = nameUnlocks(RANKING.rows, {}, ANSWERED);

    expect(rows.map((row) => row.displayName)).toEqual(["BOSS_1", "HALL_1"]);
    expect(rows.map((row) => row.icon)).toEqual([null, null]);
  });

  /** A name Steam sends empty would draw an empty row, which is worse than a key. */
  it("keeps the apiName where the game names it with nothing", () => {
    const rows = nameUnlocks(RANKING.rows, {
      [SOULSTONE]: namesFor({ BOSS_1: ["", "https://icon/boss1.jpg"] }),
    }, ANSWERED);

    expect(rows[0]).toMatchObject({
      displayName: "BOSS_1",
      icon: "https://icon/boss1.jpg",
    });
  });

  it("leaves the ranking in the order it was decided", () => {
    const rows = nameUnlocks(RANKING.rows, {
      [HALLS]: namesFor({ HALL_1: ["Torment Endured", "https://icon/hall1.jpg"] }),
    }, ANSWERED);

    expect(rows.map((row) => row.apiName)).toEqual(
      RANKING.rows.map((row) => row.apiName),
    );
  });
});

/**
 * The window between a ranking and its names. A row whose game has not answered
 * has nothing to show, and the apiName it was ranked under is not nothing — it
 * reads as the name the game gave it.
 */
describe("nameUnlocks, while a game has yet to answer", () => {
  const RANKING = rank({
    [SOULSTONE]: {
      unlocked: { BOSS_1: "2026-01-01T00:00:00Z" },
      published: { BOSS_1: 0.4 },
    },
    [HALLS]: {
      unlocked: { HALL_1: "2026-01-03T00:00:00Z" },
      published: { HALL_1: 0.9 },
    },
  });

  it("marks the rows of a game that has not answered, and no others", () => {
    const rows = nameUnlocks(RANKING.rows, {}, new Set([SOULSTONE]));

    expect(rows.find((row) => row.appId === SOULSTONE)?.pending).toBe(true);
    expect(rows.find((row) => row.appId === HALLS)?.pending).toBe(false);
  });

  /**
   * The one distinction this field exists for: a game that answered without
   * naming the row is finished, and #57 keeps that row on its apiName. Only a
   * row still waiting may be drawn as waiting.
   */
  it("does not mark a row its game answered about without naming", () => {
    const rows = nameUnlocks(RANKING.rows, {}, new Set());

    expect(rows.every((row) => row.pending)).toBe(false);
    expect(rows.map((row) => row.displayName)).toEqual(["BOSS_1", "HALL_1"]);
  });
});
