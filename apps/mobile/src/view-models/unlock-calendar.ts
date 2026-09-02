import { formatDay, MONTHS, type TallyByAppId } from "./library";

/**
 * How a library's unlocking is spread over its days.
 *
 * Everything here is derived from the tallies the library already holds, so a
 * calendar costs no request of its own (ADR-0006). It is rebuilt whole on every
 * wave of tallies — roughly a thousand timestamps bucketed into at most 366
 * days, beside a JSON parse already being paid — rather than accumulated into,
 * which would be an optimisation without a measurement.
 */

const MS_PER_SECOND = 1000;
const DAYS_PER_WEEK = 7;
const MONTHS_IN_A_YEAR = 12;

/** Three, six or twelve months, ending today. */
export type CalendarWindow = 3 | 6 | 12;

/** Longest last: the chips read left to right as the view zooms out. */
export const CALENDAR_WINDOWS: readonly CalendarWindow[] = [3, 6, 12];

/** A day with no unlocks at all, which is drawn but not tinted. */
export const NO_TONE = 0;

/** The palest tone, and the darkest: a day climbs between them. */
export const TONE_COUNT = 4;

export type UnlockDay = {
  /**
   * Midnight on that day, in the device's own time zone. One value per day,
   * so a day can be found, compared and remembered by the reader's tap.
   */
  readonly at: number;
  readonly count: number;
  /** NO_TONE for a day with none, then 1 to TONE_COUNT as the count climbs. */
  readonly step: number;
};

/**
 * One column: Monday to Sunday. Null is a day the grid does not draw — the
 * days of this week that have not happened yet. A day beyond today and a day
 * with nothing on it are different absences and must not look alike.
 */
export type UnlockWeek = readonly (UnlockDay | null)[];

export type UnlockCalendar = {
  readonly weeks: readonly UnlockWeek[];
  /** Unlocks over every day drawn. */
  readonly total: number;
  /** The month the grid opens on, as "aug 25". */
  readonly from: string;
  /** The month it ends on, which is always today's. */
  readonly to: string;
};

/** Monday first, the way the rows run. */
const mondayIndex = (day: Date): number => (day.getDay() + 6) % DAYS_PER_WEEK;

/**
 * A day boundary is a calendar day where the player is, as `formatDay` already
 * reads one. Tests pin TZ=UTC so they do not depend on where they run.
 */
const startOfDay = (at: Date): Date =>
  new Date(at.getFullYear(), at.getMonth(), at.getDate());

/**
 * Day arithmetic through the constructor rather than by adding milliseconds:
 * twice a year a day is 23 or 25 hours long, and a calendar that adds 86 400 000
 * to a midnight lands on the previous evening.
 */
const addDays = (day: Date, days: number): Date =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate() + days);

const mondayOnOrBefore = (day: Date): Date => addDays(day, -mondayIndex(day));

/**
 * Where a window opens. Rounded back to a Monday so every column but the last
 * is a whole week, which is also what makes the rows line up as weekdays.
 */
const openingOf = (today: Date, months: number): Date =>
  mondayOnOrBefore(
    new Date(today.getFullYear(), today.getMonth() - months, today.getDate()),
  );

const daysFrom = (opening: Date, today: Date): readonly Date[] => {
  const days: Date[] = [];
  for (let day = opening; day <= today; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
};

/** Every unlock the library holds, counted against the day it happened on. */
const unlocksPerDay = (tallies: TallyByAppId): ReadonlyMap<number, number> => {
  const perDay = new Map<number, number>();
  for (const tally of Object.values(tallies)) {
    for (const seconds of tally.unlockedAt) {
      const day = startOfDay(new Date(seconds * MS_PER_SECOND)).getTime();
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
  }
  return perDay;
};

/** The value at that share of a sorted series, interpolated between two days. */
const quantile = (sorted: readonly number[], share: number): number => {
  const position = (sorted.length - 1) * share;
  const below = Math.floor(position);
  const low = sorted[below] ?? 0;
  const high = sorted[Math.ceil(position)] ?? low;
  return low + (high - low) * (position - below);
};

/**
 * Which tone a count is drawn in, read from the quartiles of the days that hold
 * anything at all.
 *
 * The quartiles of the **active** days rather than of the range: on the library
 * this was measured against, 353 unlocks fall on 29 days, median 7, peak 45.
 * Quartered on the peak, four days in five would share the palest tone and the
 * grid would say nothing.
 *
 * Strictly greater is what makes the degenerate libraries fall out without a
 * special case: where every active day holds exactly one unlock, all three
 * quartiles are 1, no day is above any of them, and the whole grid stays on the
 * palest tone instead of declaring a quarter of those days remarkable.
 */
const toneReadFrom = (counts: readonly number[]): ((count: number) => number) => {
  const active = counts.filter((count) => count > 0).sort((a, b) => a - b);
  const quartiles =
    active.length === 0
      ? []
      : [0.25, 0.5, 0.75].map((share) => quantile(active, share));

  return (count) =>
    count === 0
      ? NO_TONE
      : 1 + quartiles.filter((quartile) => count > quartile).length;
};

const intoWeeks = (days: readonly UnlockDay[]): readonly UnlockWeek[] => {
  const weeks: UnlockWeek[] = [];
  for (let start = 0; start < days.length; start += DAYS_PER_WEEK) {
    const week = days.slice(start, start + DAYS_PER_WEEK);
    // The last column is cut short rather than filled with days holding zero.
    weeks.push([
      ...week,
      ...Array<null>(DAYS_PER_WEEK - week.length).fill(null),
    ]);
  }
  return weeks;
};

/** "aug 25": the axis under the grid says which end of the year it is at. */
const monthLabel = (at: number): string => {
  const day = new Date(at);
  const month = MONTHS[day.getMonth()] ?? "";
  return `${month.toLowerCase()} ${String(day.getFullYear()).slice(-2)}`;
};

export const buildUnlockCalendar = (
  tallies: TallyByAppId,
  window: CalendarWindow,
  now: Date = new Date(),
): UnlockCalendar => {
  const today = startOfDay(now);
  const perDay = unlocksPerDay(tallies);
  const countOn = (day: Date): number => perDay.get(day.getTime()) ?? 0;

  // Read over twelve months whatever is on screen. Changing the duration must
  // zoom, never repaint: a day has a colour, not a colour-in-a-context.
  const toneOf = toneReadFrom(
    daysFrom(openingOf(today, MONTHS_IN_A_YEAR), today).map(countOn),
  );

  const drawn = daysFrom(openingOf(today, window), today).map((day) => {
    const count = countOn(day);
    return { at: day.getTime(), count, step: toneOf(count) };
  });

  return {
    weeks: intoWeeks(drawn),
    total: drawn.reduce((sum, day) => sum + day.count, 0),
    from: monthLabel(drawn[0]?.at ?? today.getTime()),
    to: monthLabel(today.getTime()),
  };
};

/** What a load that has finished on an empty window says instead of a figure. */
export const EMPTY_WINDOW = "no unlocks in this window";

/** Thousands spaced, as every other figure in the app is written. */
const spaced = (count: number): string =>
  count.toLocaleString("en-US").replace(/,/g, " ");

/**
 * The counter beside the title: what the window holds, and how long it is. The
 * title names the rendering, so the duration belongs here rather than there.
 */
export const describeWindow = (
  total: number,
  window: CalendarWindow,
): string =>
  total === 0 ? EMPTY_WINDOW : `${spaced(total)} in ${window} months`;

const unlocksIn = (count: number): string => {
  if (count === 0) return "no unlocks";
  return count === 1 ? "1 unlock" : `${spaced(count)} unlocks`;
};

/**
 * What a tapped day says in the counter's place. Lower case throughout, as the
 * grid's own axis is: this is a caption, not a heading.
 */
export const describeDay = (day: UnlockDay): string =>
  `${unlocksIn(day.count)} · ${formatDay(
    new Date(day.at).toISOString(),
  ).toLowerCase()}`;
