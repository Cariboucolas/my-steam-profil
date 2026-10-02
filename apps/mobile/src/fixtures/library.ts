import type { GameDto, GameTallyDto, UnlockDto } from "@steam/contracts";

import type { LibraryView, TallyByAppId } from "../view-models/library";

const MINUTES_PER_HOUR = 60;

const game = (appId: number, name: string, hours: number | null): GameDto => ({
  appId,
  name,
  playtimeMinutes: hours === null ? null : hours * MINUTES_PER_HOUR,
  iconUrl: "",
  lastPlayedAt: "2026-06-25T20:14:00Z",
});

const tally = (unlocked: number, total: number): GameTallyDto => ({
  completion: {
    unlocked,
    total,
    percentage: total === 0 ? 0 : Math.round((unlocked / total) * 100),
  },
  unlocks: [],
});

const ELDEN_RING = 1245620;

/** A library as it looks once every tally is in, played and counted. */
export const LIBRARY_GAMES: readonly GameDto[] = [
  game(ELDEN_RING, "Elden Ring", 212),
  game(1145360, "Hades", 96),
  game(413150, "Stardew Valley", 340),
  game(367520, "Hollow Knight", 58),
];

const TALLIES: TallyByAppId = {
  [ELDEN_RING]: tally(42, 42),
  1145360: tally(38, 49),
  413150: tally(31, 40),
  367520: tally(17, 63),
};

const view = (games: readonly GameDto[], tallies: TallyByAppId): LibraryView => ({
  games,
  tallies,
  sort: "completed",
  pending: new Set(),
  frozenOrder: null,
});

export const countedLibrary: LibraryView = view(LIBRARY_GAMES, TALLIES);

/** Two of the four tallies have landed; the other two are still on their way. */
export const landingLibrary: LibraryView = view(LIBRARY_GAMES, {
  1245620: tally(42, 42),
  1145360: tally(38, 49),
});

/** The same library on a profile whose hours Steam does not publish. */
export const playtimeWithheldLibrary: LibraryView = view(
  LIBRARY_GAMES.map((one) => ({ ...one, playtimeMinutes: null })),
  TALLIES,
);

/**
 * A collector's library, whose unlock count is too long to be written out in
 * full on a phone and has to be shortened (ADR-0011).
 */
export const collectorLibrary: LibraryView = view(LIBRARY_GAMES, {
  1245620: tally(61_204, 70_000),
  1145360: tally(38_500, 49_000),
  413150: tally(31_000, 40_000),
  367520: tally(17_000, 63_000),
});

const MS_PER_SECOND = 1000;
/** Late evening, so the unlocks fall on their day in any time zone near UTC. */
const UNLOCK_HOUR = 20;

/**
 * How many achievements the player earns on each day, repeating: long quiet
 * stretches, the odd single, and a few evenings of a dozen — enough spread for
 * every UnlockTone to be drawn.
 */
const DAY_PATTERN = [0, 2, 0, 0, 5, 1, 0, 0, 0, 3, 12, 0, 1, 0, 0, 7, 0, 2, 0, 0, 0] as const;

const MS_PER_DAY = 86_400_000;

/** Calendar days, counted on the dates alone so a clock change in between costs none. */
const daysBetween = (from: Date, to: Date): number =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      MS_PER_DAY,
  );

/** One unlock per achievement earned that day, dated in the player's own time. */
const unlocksOn = (since: Date, offset: number): readonly UnlockDto[] => {
  const day = new Date(
    since.getFullYear(),
    since.getMonth(),
    since.getDate() + offset,
    UNLOCK_HOUR,
  );
  const count = DAY_PATTERN[offset % DAY_PATTERN.length] ?? 0;
  return Array.from({ length: count }, (_, index) => ({
    apiName: `ACH_${offset}_${index}`,
    at: Math.floor(day.getTime() / MS_PER_SECOND),
  }));
};

/**
 * A library whose player has been unlocking since `since` and up to `today`,
 * never after: a calendar is a statement about today, and an unlock dated
 * tomorrow is one no real tally could carry.
 */
export const unlockingLibrary = (today: Date, since: Date): LibraryView => {
  const unlocks = Array.from({ length: daysBetween(since, today) + 1 }, (_, offset) =>
    unlocksOn(since, offset),
  ).flat();

  // Carried by one game: the calendar counts across the whole library, so
  // which game earned them changes nothing it draws.
  return view(LIBRARY_GAMES, {
    ...TALLIES,
    [ELDEN_RING]: { ...tally(unlocks.length, unlocks.length), unlocks },
  });
};

/** One game out of the library, for the screens that show a single one. */
export const PLAYED_GAME: GameDto = {
  appId: 1145360,
  name: "Hades",
  playtimeMinutes: 4977,
  iconUrl: "",
  lastPlayedAt: "2026-06-24T21:40:00Z",
};

/** The same game on a profile that publishes neither its hours nor when it was last played. */
export const UNDISCLOSED_GAME: GameDto = {
  ...PLAYED_GAME,
  playtimeMinutes: null,
  lastPlayedAt: null,
};
