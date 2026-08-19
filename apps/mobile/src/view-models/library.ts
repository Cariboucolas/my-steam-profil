import type { GameDto, GameProgressDto } from "@steam/contracts";

/** Progress keyed by appId; absent means "never fetched", not "none". */
export type ProgressByAppId = Readonly<Record<number, GameProgressDto>>;

export type LibrarySort = "closest" | "recent" | "playtime";

export type GameRow = {
  readonly appId: number;
  readonly name: string;
  /** Completion, or null when progress was never fetched for this game. */
  readonly percentage: number | null;
  readonly rateLabel: string;
  readonly meta: string;
};

export type LibrarySummary = {
  readonly unlocked: number;
  readonly total: number;
  readonly rateLabel: string;
  readonly fraction: string;
  readonly perfectGames: number;
  readonly playtimeLabel: string;
};

const MINUTES_PER_HOUR = 60;
const PERFECT = 100;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Hours with a thin space between thousands, as the mock writes them
 * ("3 128 h"). Anything under an hour stays in minutes.
 */
export const formatHours = (minutes: number): string => {
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min`;
  }
  const hours = Math.round(minutes / MINUTES_PER_HOUR);
  return `${hours.toLocaleString("en-US").replace(/,/g, " ")} h`;
};

/**
 * "25 Jun 2026", in the device's own time zone. Built by hand rather than with
 * Intl so the wording stays the same whatever locale the device is set to.
 * Tests pin TZ=UTC so they do not depend on where they run.
 */
export const formatDay = (iso: string): string => {
  const date = new Date(iso);
  const month = MONTHS[date.getMonth()] ?? "";
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
};

/**
 * Null covers two cases the list draws the same way: progress was never
 * fetched, and the game defines no achievements. Neither has a rate worth
 * showing, and 0 % would read as failure rather than absence.
 */
const percentageOf = (progress: GameProgressDto | undefined): number | null =>
  progress && progress.completion.total > 0
    ? Math.round(progress.completion.percentage)
    : null;

const metaFor = (game: GameDto, progress: GameProgressDto | undefined): string => {
  const played = formatHours(game.playtimeMinutes);
  const when = game.lastPlayedAt ? formatDay(game.lastPlayedAt) : "never played";

  if (!progress) {
    return `${played} · ${when}`;
  }
  if (progress.completion.total === 0) {
    return `no achievements · ${played}`;
  }
  const { unlocked, total } = progress.completion;
  return `${unlocked}/${total} · ${played} · ${when}`;
};

/** Games with no completion sink to the bottom, whatever the order. */
const UNKNOWN_LAST = -1;

const comparatorFor = (
  sort: LibrarySort,
  progress: ProgressByAppId,
): ((a: GameDto, b: GameDto) => number) => {
  if (sort === "playtime") {
    return (a, b) => b.playtimeMinutes - a.playtimeMinutes;
  }
  if (sort === "recent") {
    const played = (game: GameDto) =>
      game.lastPlayedAt ? Date.parse(game.lastPlayedAt) : UNKNOWN_LAST;
    return (a, b) => played(b) - played(a);
  }
  const rate = (game: GameDto) => percentageOf(progress[game.appId]) ?? UNKNOWN_LAST;
  return (a, b) => rate(b) - rate(a);
};

export const buildLibraryRows = (
  games: readonly GameDto[],
  progress: ProgressByAppId,
  sort: LibrarySort,
): readonly GameRow[] =>
  // Copied before sorting: the caller's list is not ours to reorder.
  [...games].sort(comparatorFor(sort, progress)).map((game) => {
    const known = progress[game.appId];
    const percentage = percentageOf(known);
    return {
      appId: game.appId,
      name: game.name,
      percentage,
      rateLabel: percentage === null ? "—" : `${percentage}%`,
      meta: metaFor(game, known),
    };
  });

export const buildLibrarySummary = (
  games: readonly GameDto[],
  progress: ProgressByAppId,
): LibrarySummary => {
  const loaded = games
    .map((game) => progress[game.appId])
    .filter((entry): entry is GameProgressDto => entry !== undefined);

  const unlocked = loaded.reduce((sum, e) => sum + e.completion.unlocked, 0);
  const total = loaded.reduce((sum, e) => sum + e.completion.total, 0);
  const minutes = games.reduce((sum, game) => sum + game.playtimeMinutes, 0);
  const rate = total === 0 ? 0 : Math.round((unlocked / total) * PERFECT);

  return {
    unlocked,
    total,
    rateLabel: `${rate}%`,
    // Said out loud, because the figure only covers the games we fetched.
    fraction: `${unlocked} / ${total} across ${loaded.length} of ${games.length} games loaded`,
    perfectGames: loaded.filter(
      (e) => e.completion.total > 0 && e.completion.unlocked === e.completion.total,
    ).length,
    playtimeLabel: formatHours(minutes),
  };
};
