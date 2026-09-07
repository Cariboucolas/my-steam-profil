import { MONTHS, type LibraryView } from "./library";

/**
 * Every row spans this many columns, whatever its month holds. Deriving a
 * cell's width from its own row would spread a four-day September across the
 * whole card, and the day axis would stop meaning anything.
 */
export const COLUMNS = 31;

const MS_PER_SECOND = 1000;
const MS_PER_DAY = 86_400_000;

/**
 * How wide the window the tones are read over is. It ends today and slides by
 * a day a day, so a tone changes only when the player's own recent behaviour
 * does — never on 1 January (ADR-0007).
 */
const WINDOW_DAYS = 365;

/** What a month that held nothing writes where its total would be. */
const EM_DASH = "—";

/**
 * How dark a day is drawn: 0 is the empty tile, and 1 to 4 the four tones of
 * the one accent the design has, palest first.
 */
export type UnlockTone = 0 | 1 | 2 | 3 | 4;

/** One calendar day in the player's own time zone, and what it held. */
export type UnlockDay = { readonly count: number; readonly tone: UnlockTone };

export type UnlockMonth = {
  /** "JAN" — the shared abbreviation, in the calendar's own capitals. */
  readonly label: string;
  /**
   * The month today falls in. Its label is picked out, because that row can be
   * off screen and its absence is then what tells the reader they are not
   * looking at now. Today itself is never marked: no later day is drawn, so it
   * is always the last cell of the last row.
   */
  readonly current: boolean;
  /** What the month held: the one number the calendar states outright. */
  readonly total: number;
  /**
   * The total as the label writes it — an em dash where the month held
   * nothing, because a zero reads as a figure worth comparing and there is
   * nothing here to compare.
   */
  readonly totalLabel: string;
  /** Always 31 entries. A day that does not exist, or has not arrived, is null. */
  readonly days: readonly (UnlockDay | null)[];
};

/** One entry of the legend: a tone, and the counts it stands for. */
export type UnlockToneBand = {
  readonly tone: UnlockTone;
  /** The band as the legend writes it — "0", "1-2", "12+". */
  readonly label: string;
};

export type UnlockCalendar = {
  readonly months: readonly UnlockMonth[];
  /** The five appearances a day can take, palest first, empty tile included. */
  readonly legend: readonly UnlockToneBand[];
};

/**
 * How many days a month really has. Day zero of the next month is the last day
 * of this one, which is also what makes February answer for a leap year without
 * being asked about one.
 */
const daysIn = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

/** One integer per calendar day, so two days can be compared and subtracted. */
const dayNumber = (year: number, month: number, day: number): number =>
  Date.UTC(year, month, day) / MS_PER_DAY;

/**
 * Which day a moment fell on, read in the device's own time zone: an unlock at
 * half past eleven at night belongs to the day the player would name, not to
 * the one UTC has already moved on to.
 */
const dayNumberOf = (moment: Date): number =>
  dayNumber(moment.getFullYear(), moment.getMonth(), moment.getDate());

/**
 * How many unlocks fell on each day the player has ever had one, whatever year
 * it belongs to. The grid draws a single year and the tone scale reads a window
 * that overruns it, so nothing is thrown away by date here.
 *
 * Only games the library still holds are counted, as the summary beside it
 * does, and only tallies that have arrived — the rest are still on their way.
 */
const countByDay = (view: LibraryView): ReadonlyMap<number, number> => {
  const counts = new Map<number, number>();

  for (const game of view.games) {
    const tally = view.tallies[game.appId];
    if (!tally) continue;

    for (const seconds of tally.unlockedAt) {
      const day = dayNumberOf(new Date(seconds * MS_PER_SECOND));
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  }

  return counts;
};

/**
 * What each active day inside the window held: the days holding at least one
 * unlock in the 365 ending on `now`, today included. The epoch Steam sends for
 * an unlock it will not date (ADR-0006) is half a century outside it.
 */
const activeCountsWithin = (
  counts: ReadonlyMap<number, number>,
  now: Date,
): readonly number[] => {
  const lastDay = dayNumberOf(now);
  const firstDay = lastDay - (WINDOW_DAYS - 1);

  return [...counts]
    .filter(([day]) => day >= firstDay && day <= lastDay)
    .map(([, count]) => count);
};

/**
 * The three counts that separate the four tones, lowest first: a day counting
 * at most the first takes the palest tone, one counting more than the third the
 * darkest. Boundaries and not thresholds — they are read off this player's own
 * days, and a fixed set of them is the failure ADR-0007 rules out.
 */
type BandBoundaries = readonly [number, number, number];

/**
 * What a player with no active day at all is scaled against: a tone an unlock,
 * until they earn one. The grid is drawn empty rather than hidden, so the
 * legend under it has to say something rather than nothing.
 */
const UNSCALED_BOUNDARIES: BandBoundaries = [1, 2, 3];

/**
 * The count at `fraction` of the way up `sorted`, by nearest rank — the
 * smallest count at or below which that fraction of the sample sits. Nearest
 * rank rather than an interpolation, because a boundary at 2.75 is not a
 * boundary the legend can print.
 *
 * The rank always lands inside a sample that is never empty here; the fallback
 * is what `noUncheckedIndexedAccess` asks for, and it answers as an unscaled
 * player would.
 */
const quantile = (sorted: readonly number[], fraction: number): number =>
  sorted[Math.ceil(fraction * sorted.length) - 1] ?? 1;

/**
 * The quartiles of the active days handed in — days holding at least one
 * unlock. A day holding nothing is the empty tile and is never one of these:
 * counting empty days would spend more than half the tone range on nothing
 * (ADR-0007).
 *
 * Quartiles collapse onto one another when a player's days all held much the
 * same — three days of a single unlock have no first quartile distinct from
 * their third. Each boundary is pushed above the one below it, so four tones
 * stay four and the legend prints four ranges rather than one repeated.
 */
const bandBoundaries = (activeCounts: readonly number[]): BandBoundaries => {
  if (activeCounts.length === 0) return UNSCALED_BOUNDARIES;

  const sorted = [...activeCounts].sort((left, right) => left - right);
  const first = Math.max(1, quantile(sorted, 0.25));
  const second = Math.max(first + 1, quantile(sorted, 0.5));
  const third = Math.max(second + 1, quantile(sorted, 0.75));

  return [first, second, third];
};

/** A band holding one count writes that count; a wider one writes its two ends. */
const bandLabel = (from: number, to: number): string =>
  from === to ? String(from) : `${from}-${to}`;

/**
 * The five bands the legend prints, empty tile first. ADR-0007 spends the
 * legend on numbers — `0 · 1-2 · 3-5 · 6-11 · 12+` — rather than the customary
 * `less ▢▢▢▢▢ more`: the window the tones are read over does not match
 * the year the grid draws, and printing the boundaries is what turns that
 * mismatch from a silent trap into a stated fact.
 */
const legendFor = ([
  first,
  second,
  third,
]: BandBoundaries): readonly UnlockToneBand[] => [
  { tone: 0, label: "0" },
  { tone: 1, label: bandLabel(1, first) },
  { tone: 2, label: bandLabel(first + 1, second) },
  { tone: 3, label: bandLabel(second + 1, third) },
  { tone: 4, label: `${third + 1}+` },
];

const toneOf = (
  count: number,
  [first, second, third]: BandBoundaries,
): UnlockTone => {
  if (count === 0) return 0;
  if (count <= first) return 1;
  if (count <= second) return 2;
  if (count <= third) return 3;
  return 4;
};

/**
 * The shape of the player's year: one UnlockMonth per month already begun.
 *
 * `now` is a parameter and the clock is never read here. The whole card is a
 * statement about today, so today has to be injectable or nothing about it can
 * be tested.
 */
export const buildUnlockCalendar = (
  view: LibraryView,
  now: Date,
): UnlockCalendar => {
  const year = now.getFullYear();
  const currentMonth = now.getMonth();
  const counts = countByDay(view);
  const boundaries = bandBoundaries(activeCountsWithin(counts, now));

  const months = Array.from({ length: currentMonth + 1 }, (_, month) => {
    const current = month === currentMonth;
    // The month in progress stops at today; every earlier one is complete.
    const lastDrawn = current ? now.getDate() : daysIn(year, month);

    const days = Array.from({ length: COLUMNS }, (_, index) => {
      const day = index + 1;
      if (day > lastDrawn) return null;
      const count = counts.get(dayNumber(year, month, day)) ?? 0;
      return { count, tone: toneOf(count, boundaries) };
    });
    const total = days.reduce((sum, day) => sum + (day?.count ?? 0), 0);

    return {
      label: (MONTHS[month] ?? "").toUpperCase(),
      current,
      total,
      totalLabel: total === 0 ? EM_DASH : String(total),
      days,
    };
  });

  return { months, legend: legendFor(boundaries) };
};
