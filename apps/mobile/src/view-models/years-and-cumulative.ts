import { formatNumber } from "../i18n/format-number";
import type { Translate } from "../i18n/i18n";
import { scaleValues } from "./chart-scale";
import { type CountedUnlocks, calendarDayOf, countByDay } from "./unlock-days";

/** Beyond this many bars the axis labels every other year: ’08 to ’26 do not fit a 360 px card. */
export const MAX_LABELLED_BARS = 13;

const MONTHS_PER_YEAR = 12;

export type YearBar = {
  readonly year: number;
  /** `’14`, or null where the axis skips this year. */
  readonly label: string | null;
  /** The year's total, written only over the peak year and the current one. */
  readonly figure: string | null;
  /** The year's total, written for every year: what a touch on its bar reveals. */
  readonly amount: string;
  /** The running total at the year's end, revealed with its amount; null for a single year, drawn without a line. */
  readonly running: string | null;
  /** The year's total against the peak year's, from 0 to 1. */
  readonly share: number;
  readonly current: boolean;
};

/** A guide line across the chart: its amount, and its height against the peak year's. */
export type ScaleLine = { readonly label: string; readonly share: number };

/** One record under the chart: the figure, what it is, and when it was set. */
export type YearRecord = { readonly value: string; readonly label: string; readonly when: string };

export type YearRecords = {
  readonly bestMonth: YearRecord;
  readonly bestDay: YearRecord;
  readonly longestStreak: YearRecord;
};

export type YearsAndCumulative =
  /** Counting, and no dated unlock has landed yet: the card waits as a skeleton. */
  | { readonly kind: "waiting" }
  /** Counted through, and not one unlock carries a date. */
  | { readonly kind: "empty" }
  | {
      readonly kind: "drawn";
      readonly total: string;
      readonly span: string;
      readonly bars: readonly YearBar[];
      /** Guide lines at round amounts under the peak year, lowest first. Scales the bars, not the running total. */
      readonly scale: readonly ScaleLine[];
      /** The running total at the end of each year, against the grand total; null for a single year. */
      readonly cumulative: readonly number[] | null;
      /**
       * Null until the library is counted through: a best day read off half
       * the library can move to another day under the reader's eyes.
       */
      readonly records: YearRecords | null;
      readonly screenReaderLabel: string;
    };

const WAITING: YearsAndCumulative = { kind: "waiting" };
const EMPTY: YearsAndCumulative = { kind: "empty" };

/** A day number and the unlocks it holds, as `countByDay` pairs them. */
type DayCount = readonly [number, number];

type Best<Key> = { readonly key: Key; readonly total: number };

/**
 * The entry with the highest total, entries in chronological order. `>=`
 * rather than `>`: on a tie the later entry wins, which is the one a player
 * remembers.
 */
const mostRecentBest = <Key>(entries: readonly (readonly [Key, number])[]): Best<Key> | null =>
  entries.reduce<Best<Key> | null>(
    (best, [key, total]) => (best === null || total >= best.total ? { key, total } : best),
    null,
  );

type Run = { readonly length: number; readonly last: number };

/** The longest run of consecutive days, days in ascending order, and the day it ended on. */
const longestRun = (days: readonly number[]): Run =>
  days.reduce<{ readonly best: Run; readonly current: Run | null }>(
    ({ best, current }, day) => {
      const length = current !== null && day === current.last + 1 ? current.length + 1 : 1;
      const run = { length, last: day };
      return { best: length >= best.length ? run : best, current: run };
    },
    { best: { length: 0, last: 0 }, current: null },
  ).best;

/** Each key's total, keys in the order the days first reach them. */
const totalsBy = <Key>(
  days: readonly DayCount[],
  keyOf: (day: number) => Key,
): readonly (readonly [Key, number])[] => {
  // Filled in place and never handed out: a fresh map per day would copy
  // thousands of entries thousands of times over a long history.
  const totals = new Map<Key, number>();
  for (const [day, count] of days) {
    const key = keyOf(day);
    totals.set(key, (totals.get(key) ?? 0) + count);
  }
  return [...totals];
};

/** A month as one ordered number, so months compare and sort like days. */
const monthKeyOf = (day: number): number => {
  const { year, month } = calendarDayOf(day);
  return year * MONTHS_PER_YEAR + month;
};

const monthLabel = (monthKey: number, t: Translate): string =>
  t("stats.years.month", {
    month: t(`date.months.${monthKey % MONTHS_PER_YEAR}`),
    year: Math.floor(monthKey / MONTHS_PER_YEAR),
  });

const dayLabel = (dayNumber: number, t: Translate): string => {
  const { year, month, day } = calendarDayOf(dayNumber);
  return t("date.day", { day, month: t(`date.months.${month}`), year });
};

const recordsOf = (days: readonly DayCount[], t: Translate): YearRecords | null => {
  const month = mostRecentBest(totalsBy(days, monthKeyOf));
  const day = mostRecentBest(days);
  if (month === null || day === null) return null;
  const streak = longestRun(days.map(([dayNumber]) => dayNumber));

  return {
    bestMonth: {
      value: formatNumber(t, month.total),
      label: t("stats.years.bestMonth"),
      when: monthLabel(month.key, t),
    },
    bestDay: {
      value: formatNumber(t, day.total),
      label: t("stats.years.bestDay"),
      when: dayLabel(day.key, t),
    },
    longestStreak: {
      value: t("stats.years.streakDays", { count: streak.length }),
      label: t("stats.years.longestStreak"),
      when: monthLabel(monthKeyOf(streak.last), t),
    },
  };
};

/** Every year labelled while they fit; past that, every other one counted back from the last. */
const axisLabel = (year: number, lastYear: number, barCount: number): string | null =>
  barCount <= MAX_LABELLED_BARS || (lastYear - year) % 2 === 0 ? `’${String(year).slice(2)}` : null;

/** The running total at the end of each year, in whole unlocks. */
const runningTotals = (totals: readonly number[]): readonly number[] =>
  totals.map((_, index) => totals.slice(0, index + 1).reduce((sum, total) => sum + total, 0));

/**
 * What the years card draws: each calendar year's dated unlocks, from the
 * first one's year to this one, the running total over them, and three
 * records once the library is counted through. Days are the device's own
 * (`countByDay`), and an unlock Steam will not date counts nowhere.
 */
export const buildYearsAndCumulative = (
  view: CountedUnlocks,
  counted: boolean,
  now: Date,
  t: Translate,
): YearsAndCumulative => {
  const days = [...countByDay(view)].sort(([a], [b]) => a - b);
  const firstDay = days[0];
  const lastDay = days.at(-1);
  if (firstDay === undefined || lastDay === undefined) return counted ? EMPTY : WAITING;

  const thisYear = now.getFullYear();
  const firstYear = calendarDayOf(firstDay[0]).year;
  // An unlock dated after this year still has a bar to land in.
  const lastYear = Math.max(thisYear, calendarDayOf(lastDay[0]).year);
  const byYear = new Map(totalsBy(days, (day) => calendarDayOf(day).year));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const totals = years.map((year) => byYear.get(year) ?? 0);
  // Summed in whole unlocks and divided once, so the last share is exactly 1.
  const running = years.length === 1 ? null : runningTotals(totals);
  const grandTotal = totals.reduce((sum, total) => sum + total, 0);
  const peak = mostRecentBest(years.map((year, index) => [year, totals[index] ?? 0] as const));
  const peakYear = peak?.key ?? lastYear;
  const peakTotal = peak?.total ?? 0;

  const bars = years.map((year, index): YearBar => {
    const total = totals[index] ?? 0;
    const current = year === thisYear;
    const amount = formatNumber(t, total);
    return {
      year,
      label: axisLabel(year, lastYear, years.length),
      figure: year === peakYear || current ? amount : null,
      amount,
      running: running === null ? null : formatNumber(t, running[index] ?? 0),
      share: peakTotal === 0 ? 0 : total / peakTotal,
      current,
    };
  });

  return {
    kind: "drawn",
    total: formatNumber(t, grandTotal),
    span: t("stats.years.span", { first: firstYear, last: lastYear }),
    bars,
    scale: scaleValues(peakTotal).map((value) => ({
      label: formatNumber(t, value),
      share: value / peakTotal,
    })),
    cumulative: running?.map((sum) => sum / grandTotal) ?? null,
    records: counted ? recordsOf(days, t) : null,
    screenReaderLabel: t("stats.years.spoken", {
      count: grandTotal,
      first: firstYear,
      last: lastYear,
      total: formatNumber(t, grandTotal),
      best: peakYear,
      bestTotal: formatNumber(t, peakTotal),
    }),
  };
};
