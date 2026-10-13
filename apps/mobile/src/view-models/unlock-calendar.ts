import type { Translate } from "../i18n/i18n";
import type { LibraryView } from "./library";
import {
  legendFor,
  toneOf,
  toneScaleOf,
  type UnlockTone,
  type UnlockToneBand,
  type UnlockToneScale,
} from "./tone-scale";
import { countByDay, dayNumber, dayNumberOf } from "./unlock-days";

export type { UnlockTone, UnlockToneBand, UnlockToneScale } from "./tone-scale";

/**
 * Every row spans this many columns, whatever its month holds. Deriving a
 * cell's width from its own row would spread a four-day September across the
 * whole card, and the day axis would stop meaning anything.
 */
export const COLUMNS = 31;

/**
 * How wide the window the tones are read over is. It ends today and slides by
 * a day a day, so a tone changes only when the player's own recent behaviour
 * does — never on 1 January (ADR-0007).
 */
const WINDOW_DAYS = 365;

/** What a month that held nothing writes where its total would be. */
const EM_DASH = "—";

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
   *
   * Named for who reads it rather than for the prop it is handed to. It says
   * nothing about language: everything on this card ships in English, and
   * `label` above is the same sentence written for the eye.
   */
  readonly screenReaderLabel: string;
  /** Always 31 entries. A day that does not exist, or has not arrived, is null. */
  readonly days: readonly (UnlockDay | null)[];
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
 * The row as it is read rather than looked at: its month, and what it held.
 *
 * The figure is spelled out even where the row draws an em dash. The dash is a
 * mark for the eye, saying there is nothing here worth comparing; read aloud it
 * is a silence, and a row silent about its own total is one whose total sounds
 * missing rather than nothing.
 *
 * The month always lands inside the twelve, as it does for the row's own
 * abbreviation below. The names are the catalog's, so the month is said in the
 * language the reader chose.
 */
const screenReaderLabelFor = (month: number, total: number, t: Translate): string =>
  t("calendar.monthSpoken", { month: t(`calendar.monthNames.${month}`), count: total });

/**
 * How many days a month really has. Day zero of the next month is the last day
 * of this one, which is also what makes February answer for a leap year without
 * being asked about one.
 */
const daysIn = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

/**
 * What each active day inside the window held: the days holding at least one
 * unlock in the 365 ending on `now`, today included. The epoch Steam sends for
 * an unlock it will not date (ADR-0006) is half a century outside it.
 */
const activeCountsWithin = (counts: ReadonlyMap<number, number>, now: Date): readonly number[] => {
  const lastDay = dayNumberOf(now);
  const firstDay = lastDay - (WINDOW_DAYS - 1);

  return [...counts].filter(([day]) => day >= firstDay && day <= lastDay).map(([, count]) => count);
};

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
  t: Translate,
  held: UnlockToneScale | null = null,
): UnlockCalendar => {
  const year = now.getFullYear();
  const currentMonth = now.getMonth();
  const counts = countByDay(view);
  const counting = view.pending.size > 0;
  // Held still while the waves land, and read once more when the last of them
  // has: the scale a load ends on has the whole window behind it, not the
  // first wave alone (ADR-0007).
  const read = counting && held !== null ? held : toneScaleOf(activeCountsWithin(counts, now));
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
      label: t(`calendar.months.${month}`).toUpperCase(),
      current,
      total,
      totalLabel: total === 0 ? EM_DASH : String(total),
      screenReaderLabel: screenReaderLabelFor(month, total, t),
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
        : t("calendar.delta", {
            signed: signedFigure(total - lastYearsTotal),
            year: lastYear,
            total: lastYearsTotal,
          }),
    frameLabel: t("calendar.frame", {
      year,
      first: t("calendar.months.0").toUpperCase(),
      last: t("calendar.months.11").toUpperCase(),
    }),
    months,
    legend: legendFor(scale),
    counting,
    scale: read,
  };
};
