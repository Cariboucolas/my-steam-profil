import type { GameCompletionDto, GameDto } from "@steam/contracts";

/** Tallies keyed by appId; absent means "not asked for yet", not "none". */
export type CompletionByAppId = Readonly<Record<number, GameCompletionDto>>;

export type LibrarySort = "completed" | "recent" | "playtime";

export type GameRow = {
  readonly appId: number;
  readonly name: string;
  /** Completion, or null when there is no tally to show. */
  readonly percentage: number | null;
  readonly rateLabel: string;
  readonly meta: string;
  /**
   * A tally for this game is on its way. The row draws a skeleton rather than a
   * dash: a game being counted and a game with nothing to count must not look
   * the same, or waiting reads as an empty result.
   */
  readonly pending: boolean;
};

/** Everything the list needs to lay itself out, including what it is still waiting for. */
export type LibraryView = {
  readonly games: readonly GameDto[];
  readonly completions: CompletionByAppId;
  readonly sort: LibrarySort;
  /** Games whose tally has been asked for and has not come back. */
  readonly pending: ReadonlySet<number>;
  /**
   * While tallies are arriving, the order the list started with. The chosen
   * order depends on tallies, so re-deriving it on every wave would move rows
   * under the reader's finger. Null once nothing is outstanding.
   */
  readonly frozenOrder: readonly number[] | null;
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
 * Null covers two cases the list draws the same way: no tally was fetched, and
 * the game defines no achievements. Neither has a rate worth showing, and 0 %
 * would read as failure rather than absence.
 */
const percentageOf = (tally: GameCompletionDto | undefined): number | null =>
  tally && tally.total > 0 ? Math.round(tally.percentage) : null;

const metaFor = (game: GameDto, tally: GameCompletionDto | undefined): string => {
  const played = formatHours(game.playtimeMinutes);
  const when = game.lastPlayedAt ? formatDay(game.lastPlayedAt) : "never played";

  if (!tally) {
    return `${played} · ${when}`;
  }
  if (tally.total === 0) {
    return `no achievements · ${played}`;
  }
  return `${tally.unlocked}/${tally.total} · ${played} · ${when}`;
};

/** A game never launched has no date to sort on, so it goes last. */
const NEVER_PLAYED_LAST = -1;

/**
 * Which band a game belongs to under the default order: finished first, then
 * started, then everything with no tally to speak of.
 */
const FINISHED = 0;
const STARTED = 1;
const NOTHING_TO_SHOW = 2;

const bandOf = (tally: GameCompletionDto | undefined): number => {
  if (!tally || tally.total === 0) return NOTHING_TO_SHOW;
  return tally.unlocked === tally.total ? FINISHED : STARTED;
};

/**
 * Finished games first, richest first among them: 400 of 400 is a larger thing
 * to have done than 10 of 10, and the order should say so. Unfinished games
 * follow by how far along they are, and a game with more to earn leads a game
 * with less at the same rate.
 */
const byWhatIsFinished = (
  completions: CompletionByAppId,
): ((a: GameDto, b: GameDto) => number) => {
  const of = (game: GameDto) => completions[game.appId];
  return (a, b) => {
    const [left, right] = [of(a), of(b)];
    const band = bandOf(left) - bandOf(right);
    if (band !== 0) return band;

    // Within the finished band the rate is 100 for everyone, so size decides.
    if (bandOf(left) === STARTED) {
      const rate = (right?.percentage ?? 0) - (left?.percentage ?? 0);
      if (rate !== 0) return rate;
    }
    return (right?.total ?? 0) - (left?.total ?? 0);
  };
};

const comparatorFor = (
  sort: LibrarySort,
  completions: CompletionByAppId,
): ((a: GameDto, b: GameDto) => number) => {
  if (sort === "playtime") {
    return (a, b) => b.playtimeMinutes - a.playtimeMinutes;
  }
  if (sort === "recent") {
    const played = (game: GameDto) =>
      game.lastPlayedAt ? Date.parse(game.lastPlayedAt) : NEVER_PLAYED_LAST;
    return (a, b) => played(b) - played(a);
  }
  return byWhatIsFinished(completions);
};

/**
 * Orders by the pinned sequence when there is one, and appends anything the
 * sequence does not name rather than dropping it — a library that grew under a
 * running load must still show every game it has.
 */
const orderedBy = (
  games: readonly GameDto[],
  pinned: readonly number[],
): readonly GameDto[] => {
  const rank = new Map(pinned.map((appId, index) => [appId, index]));
  const place = (game: GameDto) => rank.get(game.appId) ?? rank.size;
  return [...games].sort((a, b) => place(a) - place(b));
};

export const buildLibraryRows = (view: LibraryView): readonly GameRow[] => {
  const { games, completions, sort, pending, frozenOrder } = view;

  // Copied before sorting: the caller's list is not ours to reorder.
  const ordered = frozenOrder
    ? orderedBy(games, frozenOrder)
    : [...games].sort(comparatorFor(sort, completions));

  return ordered.map((game) => {
    const tally = completions[game.appId];
    const percentage = percentageOf(tally);
    return {
      appId: game.appId,
      name: game.name,
      percentage,
      rateLabel: percentage === null ? "—" : `${percentage}%`,
      meta: metaFor(game, tally),
      pending: pending.has(game.appId) && tally === undefined,
    };
  });
};

/**
 * Reads the same LibraryView the rows are built from. The card and the list
 * describe one screen, so a caller holds one thing and hands it to both — even
 * though the summary has no use for the chosen order or for what is still
 * outstanding.
 */
export const buildLibrarySummary = (view: LibraryView): LibrarySummary => {
  const { games, completions } = view;

  const loaded = games
    .map((game) => completions[game.appId])
    .filter((entry): entry is GameCompletionDto => entry !== undefined);

  const unlocked = loaded.reduce((sum, e) => sum + e.unlocked, 0);
  const total = loaded.reduce((sum, e) => sum + e.total, 0);
  const minutes = games.reduce((sum, game) => sum + game.playtimeMinutes, 0);
  const rate = total === 0 ? 0 : Math.round((unlocked / total) * PERFECT);

  return {
    unlocked,
    total,
    rateLabel: `${rate}%`,
    // Names what was measured and claims nothing about the rest: the games
    // left out were never launched, so they are excluded rather than missing.
    fraction: `${unlocked} / ${total} across ${loaded.length} games counted`,
    perfectGames: loaded.filter((e) => e.total > 0 && e.unlocked === e.total).length,
    playtimeLabel: formatHours(minutes),
  };
};
