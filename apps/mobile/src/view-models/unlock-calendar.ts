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
  /**
   * The whole row in one sentence — `March, 12 unlocks` — because the row is
   * one screen-reader stop and its cells are none. Three hundred and sixty-five
   * stops is a punitive traversal for what the row already states, and a
   * nine-pixel cell is not a target a finger could find anyway.
   */
  readonly a11yLabel: string;
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
  /** The calendar year drawn, and the one every figure here is about. */
  readonly year: number;
  /**
   * What the player has unlocked in that year so far — the months on screen
   * added up, and never a count of anything they are not being shown.
   */
  readonly total: number;
  /**
   * The whole of the previous calendar year: a finished year set against a
   * running one, deliberately unequal. Null where that year held nothing,
   * because a player who was not there has nothing to be measured against.
   */
  readonly lastYearsTotal: number | null;
  /**
   * Where the running year stands against it — `-224 vs all of 2025 (306)`.
   * The words "all of" are what stop a reader taking two unequal spans for a
   * like-for-like comparison, and go wherever the figure does. Null exactly
   * when `lastYearsTotal` is.
   */
  readonly deltaLabel: string | null;
  /** The year and how far it runs — `YEAR 2026 · JAN → DEC`. */
  readonly frameLabel: string;
  readonly months: readonly UnlockMonth[];
  /** The five appearances a day can take, palest first, empty tile included. */
  readonly legend: readonly UnlockToneBand[];
  /**
   * Whether a tally the library asked for has still to come back. The grid is
   * built over and over while the waves land, and this is what tells one of
   * those builds from the last of them.
   */
  readonly counting: boolean;
  /**
   * The scale read off this player's own days, and so the one worth handing
   * back to the next build — which is how it holds still. Null until a day of
   * theirs has arrived to read one from: the grid draws against a stand-in
   * until then, and a stand-in held for a whole load is the fixed thresholds
   * ADR-0007 rules out, arriving by another road.
   */
  readonly scale: UnlockToneScale | null;
};

/**
 * The months as they are said, rather than as a row writes them. `MAR` is
 * three capitals fitted to a 44-pixel column; it is not a word anyone is read.
 * Written out here rather than asked of Intl, as `formatDate` is, so that the
 * wording does not follow the device's locale.
 */
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * The row as it is read rather than looked at: its month, and what it held.
 *
 * The figure is spelled out even where the row draws an em dash. The dash is a
 * mark for the eye, saying there is nothing here worth comparing; read aloud it
 * is a silence, and a row silent about its own total is one whose total sounds
 * missing rather than nothing.
 */
const a11yLabelFor = (month: number, total: number): string =>
  `${MONTH_NAMES[month] ?? ""}, ${total} ${total === 1 ? "unlock" : "unlocks"}`;

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
export type UnlockToneScale = readonly [number, number, number];

/**
 * What a calendar with no active day at all is drawn against: a tone an
 * unlock, until one is earned or counted. The grid is drawn empty rather than
 * hidden, so the legend under it has to say something rather than nothing.
 *
 * Drawn against, never held: a library still being counted has no active day
 * yet either, and holding this through its load would colour the whole of it
 * against a scale that is nobody's.
 */
const UNSCALED_SCALE: UnlockToneScale = [1, 2, 3];

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
 *
 * Null where there is no active day to read: no scale can be had from nothing,
 * and saying so is what keeps the stand-in from being mistaken for one.
 */
const scaleRead = (
  activeCounts: readonly number[],
): UnlockToneScale | null => {
  if (activeCounts.length === 0) return null;

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
]: UnlockToneScale): readonly UnlockToneBand[] => [
  { tone: 0, label: "0" },
  { tone: 1, label: bandLabel(1, first) },
  { tone: 2, label: bandLabel(first + 1, second) },
  { tone: 3, label: bandLabel(second + 1, third) },
  { tone: 4, label: `${third + 1}+` },
];

const toneOf = (
  count: number,
  [first, second, third]: UnlockToneScale,
): UnlockTone => {
  if (count === 0) return 0;
  if (count <= first) return 1;
  if (count <= second) return 2;
  if (count <= third) return 3;
  return 4;
};

/**
 * Everything the player unlocked in the whole of the calendar year named. Read
 * off the same days the grid is drawn from, so no year needs a request of its
 * own: a GameTally carries every instant the player has ever earned (ADR-0006).
 */
const totalIn = (counts: ReadonlyMap<number, number>, year: number): number => {
  const first = dayNumber(year, 0, 1);
  const last = dayNumber(year, 11, 31);

  return [...counts]
    .filter(([day]) => day >= first && day <= last)
    .reduce((sum, [, count]) => sum + count, 0);
};

/**
 * The difference as the header writes it, its direction read rather than
 * worked out. A year that has drawn level says so with a bare `0`: there is no
 * direction left to sign.
 */
const signedFigure = (difference: number): string =>
  difference > 0 ? `+${difference}` : String(difference);

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
  held: UnlockToneScale | null = null,
): UnlockCalendar => {
  const year = now.getFullYear();
  const currentMonth = now.getMonth();
  const counts = countByDay(view);
  const counting = view.pending.size > 0;
  // Held still while the waves land, and read once more when the last of them
  // has: the scale a load ends on has the whole window behind it, not the
  // first wave alone (ADR-0007).
  const read =
    counting && held !== null
      ? held
      : scaleRead(activeCountsWithin(counts, now));
  const scale = read ?? UNSCALED_SCALE;

  const months = Array.from({ length: currentMonth + 1 }, (_, month) => {
    const current = month === currentMonth;
    // The month in progress stops at today; every earlier one is complete.
    const lastDrawn = current ? now.getDate() : daysIn(year, month);

    const days = Array.from({ length: COLUMNS }, (_, index) => {
      const day = index + 1;
      if (day > lastDrawn) return null;
      const count = counts.get(dayNumber(year, month, day)) ?? 0;
      return { count, tone: toneOf(count, scale) };
    });
    const total = days.reduce((sum, day) => sum + (day?.count ?? 0), 0);

    return {
      label: (MONTHS[month] ?? "").toUpperCase(),
      current,
      total,
      totalLabel: total === 0 ? EM_DASH : String(total),
      a11yLabel: a11yLabelFor(month, total),
      days,
    };
  });

  // The header states the grid's own rows, never a second count of the same
  // days: a total that could disagree with what is on screen is worse than no
  // total at all.
  const total = months.reduce((sum, month) => sum + month.total, 0);
  const lastYear = year - 1;
  // A year that held nothing is no target: "-0 vs all of 2025 (0)" is a true
  // sentence measuring a player against a year they were not there for, so
  // both figures go rather than one of them reading as a zero worth beating.
  const lastYearsCount = totalIn(counts, lastYear);
  const lastYearsTotal = lastYearsCount === 0 ? null : lastYearsCount;

  return {
    year,
    total,
    lastYearsTotal,
    deltaLabel:
      lastYearsTotal === null
        ? null
        : `${signedFigure(total - lastYearsTotal)} vs all of ${lastYear} (${lastYearsTotal})`,
    frameLabel: `YEAR ${year} · JAN → DEC`,
    months,
    legend: legendFor(scale),
    counting,
    scale: read,
  };
};
