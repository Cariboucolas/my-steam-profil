import { formatNumber } from "../i18n/format-number";
import type { Translate } from "../i18n/i18n";
import { FIRST_DAY_OF_WEEK, type Locale } from "../i18n/locale";
import { scaleValues } from "./chart-scale";
import {
  legendFor,
  toneOf,
  toneScaleOf,
  type UnlockTone,
  type UnlockToneBand,
  type UnlockToneScale,
} from "./tone-scale";
import { type CountedUnlocks, MS_PER_SECOND } from "./unlock-days";
import type { ScaleLine } from "./years-and-cumulative";

const DAYS_PER_WEEK = 7;
const HOURS_PER_DAY = 24;
/** As `Date.getDay` numbers them. */
const SUNDAY = 0;
const SATURDAY = 6;
/** The evening runs from 6 pm to midnight, the night from midnight to 6 am. */
const EVENING_FROM = 18;
const NIGHT_UNTIL = 6;
/** The axis names every sixth hour: midnight, 6 am, noon, 6 pm. */
const TICK_EVERY = 6;
const PERCENT = 100;

/** One day of the week, as the grid draws it: its letter, and its 24 hours' tones. */
export type UnlockWeekRow = {
  /** As `Date.getDay` numbers it; two rows can share a letter, never a day. */
  readonly day: number;
  readonly label: string;
  readonly cells: readonly UnlockTone[];
};

/** One hour of the day, all seven of its slots together. */
export type HourBar = {
  /** The hour's total against the busiest hour's, from 0 to 1. */
  readonly share: number;
  readonly busiest: boolean;
  /** The total, written over the busiest hour only. */
  readonly figure: string | null;
  /** The hour's name, on every sixth hour of the axis. */
  readonly tick: string | null;
};

/** One share under the chart: the percentage, and what it is a share of. */
export type ShareFigure = { readonly value: string; readonly label: string };

export type UnlockWeek =
  /** Still counting, and nothing dated has landed yet. */
  | { readonly kind: "waiting" }
  /** Counted, and nothing was dated. */
  | { readonly kind: "empty" }
  | {
      readonly kind: "drawn";
      /** Seven, from the Locale's first day. */
      readonly rows: readonly UnlockWeekRow[];
      /** Twenty-four, from midnight. */
      readonly hours: readonly HourBar[];
      readonly scale: readonly ScaleLine[];
      readonly legend: readonly UnlockToneBand[];
      /** What the tones were read against: what the hook holds while counting. */
      readonly toneScale: UnlockToneScale;
      /** "Sat 9 pm"; null until counted, since a record shown early can move. */
      readonly busiestSlot: string | null;
      /** Evening, weekend, night; null until counted. */
      readonly shares: readonly ShareFigure[] | null;
      readonly screenReaderLabel: string;
    };

/** What a slot or an hour holds, and when its latest unlock was earned, which breaks a tie. */
type Load = { readonly count: number; readonly latest: number };

/** Every UnlockSlot's load, read through `slotOf`. */
type SlotOf = (day: number, hour: number) => Load;

const NOTHING: Load = { count: 0, latest: Number.NEGATIVE_INFINITY };
const WAITING: UnlockWeek = { kind: "waiting" };
const EMPTY: UnlockWeek = { kind: "empty" };

const DAYS = Array.from({ length: DAYS_PER_WEEK }, (_, day) => day);
const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);

const slotIndex = (day: number, hour: number): number => day * HOURS_PER_DAY + hour;

const together = (left: Load, right: Load): Load => ({
  count: left.count + right.count,
  latest: Math.max(left.latest, right.latest),
});

/**
 * Every UnlockSlot's load, indexed by `slotIndex`. Read like the calendar's
 * days: only games still in the library, only tallies that have landed, and no
 * unlock Steam will not date. Day and hour are the device's own, today.
 */
const loadSlots = (view: CountedUnlocks): readonly Load[] => {
  const slots: Load[] = Array.from({ length: DAYS_PER_WEEK * HOURS_PER_DAY }, () => NOTHING);

  for (const game of view.games) {
    const tally = view.tallies[game.appId];
    if (!tally) continue;

    for (const unlock of tally.unlocks) {
      if (unlock.at === null) continue;
      const when = new Date(unlock.at * MS_PER_SECOND);
      const index = slotIndex(when.getDay(), when.getHours());
      slots[index] = together(slots[index] ?? NOTHING, { count: 1, latest: unlock.at });
    }
  }

  return slots;
};

/**
 * The busiest of `candidates`: the one holding most, and of those the one
 * whose latest unlock is the more recent. Two candidates cannot share a latest
 * instant — an instant falls in one slot and one hour — so this never ties.
 */
const busiestOf = <Key>(candidates: readonly { readonly key: Key; readonly load: Load }[]): Key =>
  candidates.reduce((best, candidate) =>
    candidate.load.count > best.load.count ||
    (candidate.load.count === best.load.count && candidate.load.latest > best.load.latest)
      ? candidate
      : best,
  ).key;

const sumOf = (loads: readonly Load[]): number => loads.reduce((sum, load) => sum + load.count, 0);

const hourName = (hour: number, t: Translate): string => t(`stats.week.hours.${hour}`);

/** The seven rows, from the day the Locale starts its week on. */
const rowsOf = (
  slotOf: SlotOf,
  toneScale: UnlockToneScale,
  locale: Locale,
  t: Translate,
): readonly UnlockWeekRow[] =>
  DAYS.map((offset) => {
    const day = (FIRST_DAY_OF_WEEK[locale] + offset) % DAYS_PER_WEEK;
    return {
      day,
      label: t(`stats.week.letters.${day}`),
      cells: HOURS.map((hour) => toneOf(slotOf(day, hour).count, toneScale)),
    };
  });

const hourBarsOf = (
  hourLoads: readonly Load[],
  busiestHour: number,
  peak: number,
  t: Translate,
): readonly HourBar[] =>
  hourLoads.map((load, hour) => ({
    share: load.count / peak,
    busiest: hour === busiestHour,
    figure: hour === busiestHour ? formatNumber(t, peak) : null,
    tick: hour % TICK_EVERY === 0 ? hourName(hour, t) : null,
  }));

const percentOf = (part: number, whole: number, t: Translate): string =>
  t("stats.week.percent", { value: formatNumber(t, Math.round((PERCENT * part) / whole)) });

/** Evening, weekend and night, each as a share of every dated unlock. They overlap. */
const sharesOf = (
  slotOf: SlotOf,
  hourLoads: readonly Load[],
  total: number,
  t: Translate,
): readonly ShareFigure[] => {
  const weekend = [SATURDAY, SUNDAY].flatMap((day) => HOURS.map((hour) => slotOf(day, hour)));
  return [
    {
      value: percentOf(sumOf(hourLoads.slice(EVENING_FROM)), total, t),
      label: t("stats.week.evening"),
    },
    { value: percentOf(sumOf(weekend), total, t), label: t("stats.week.weekend") },
    {
      value: percentOf(sumOf(hourLoads.slice(0, NIGHT_UNTIL)), total, t),
      label: t("stats.week.night"),
    },
  ];
};

/** The busiest slot, written short for the eye and long for the ear. */
const busiestSlotOf = (slotOf: SlotOf, t: Translate): { written: string; spoken: string } => {
  const { day, hour } = busiestOf(
    DAYS.flatMap((d) => HOURS.map((h) => ({ key: { day: d, hour: h }, load: slotOf(d, h) }))),
  );
  const slot = (dayKey: string) =>
    t("stats.week.slot", { day: t(`stats.week.${dayKey}.${day}`), hour: hourName(hour, t) });
  return { written: slot("days"), spoken: slot("dayNames") };
};

/**
 * The player's typical week: every UnlockSlot in its tone, every hour as a
 * bar, the busiest slot and three shares — the last two only once counted,
 * since either can still move while tallies land. The tones are read against
 * `held` while counting, when the caller holds one (ADR-0007).
 */
export const buildUnlockWeek = (
  view: CountedUnlocks,
  counted: boolean,
  locale: Locale,
  t: Translate,
  held: UnlockToneScale | null,
): UnlockWeek => {
  const slots = loadSlots(view);
  const slotOf: SlotOf = (day, hour) => slots[slotIndex(day, hour)] ?? NOTHING;

  const read = toneScaleOf(slots.map((slot) => slot.count).filter((count) => count > 0));
  if (read === null) return counted ? EMPTY : WAITING;
  const toneScale = !counted && held !== null ? held : read;

  const hourLoads = HOURS.map((hour) =>
    DAYS.map((day) => slotOf(day, hour)).reduce(together, NOTHING),
  );
  const busiestHour = busiestOf(hourLoads.map((load, hour) => ({ key: hour, load })));
  const peak = hourLoads[busiestHour]?.count ?? 0;
  const spokenHour = { count: peak, hour: hourName(busiestHour, t), total: formatNumber(t, peak) };

  const drawn = {
    kind: "drawn" as const,
    rows: rowsOf(slotOf, toneScale, locale, t),
    hours: hourBarsOf(hourLoads, busiestHour, peak, t),
    scale: scaleValues(peak).map((value) => ({
      label: formatNumber(t, value),
      share: value / peak,
    })),
    legend: legendFor(toneScale),
    toneScale,
  };

  if (!counted) {
    return {
      ...drawn,
      busiestSlot: null,
      shares: null,
      screenReaderLabel: t("stats.week.spokenCounting", spokenHour),
    };
  }

  const slot = busiestSlotOf(slotOf, t);
  const shares = sharesOf(slotOf, hourLoads, sumOf(slots), t);
  const [evening, weekend, night] = shares.map((share) => share.value);
  return {
    ...drawn,
    busiestSlot: slot.written,
    shares,
    screenReaderLabel: t("stats.week.spoken", {
      ...spokenHour,
      slot: slot.spoken,
      evening,
      weekend,
      night,
    }),
  };
};
