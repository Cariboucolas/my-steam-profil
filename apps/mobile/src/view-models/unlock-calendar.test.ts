import type { GameTallyDto } from "@steam/contracts";

import type { TallyByAppId } from "./library";
import {
  buildUnlockCalendar,
  describeDay,
  describeWindow,
  EMPTY_WINDOW,
  type UnlockDay,
} from "./unlock-calendar";

/** A Wednesday, so a cut-short last column has something to show. */
const TODAY = new Date(2026, 7, 26);
const MS_PER_SECOND = 1000;

const midday = (daysAgo: number): Date =>
  new Date(2026, 7, 26 - daysAgo, 12, 30);

const secondsAt = (date: Date): number =>
  Math.floor(date.getTime() / MS_PER_SECOND);

const tallyOf = (unlockedAt: readonly number[]): GameTallyDto => ({
  // A calendar reads the dates alone; the tally half is here to be ignored.
  completion: { unlocked: unlockedAt.length, total: 100, percentage: 1 },
  unlockedAt: [...unlockedAt].sort((a, b) => a - b),
});

/** One game's worth of unlocks, given as "this many, that many days ago". */
const unlocking = (perDay: Readonly<Record<number, number>>): GameTallyDto =>
  tallyOf(
    Object.entries(perDay).flatMap(([daysAgo, count]) =>
      Array.from({ length: count }, () => secondsAt(midday(Number(daysAgo)))),
    ),
  );

const libraryUnlocking = (
  perDay: Readonly<Record<number, number>>,
): TallyByAppId => ({ 2066020: unlocking(perDay) });

const NOTHING: TallyByAppId = {};

const calendarOf = (
  tallies: TallyByAppId,
  window: 3 | 6 | 12 = 12,
): ReturnType<typeof buildUnlockCalendar> =>
  buildUnlockCalendar(tallies, window, TODAY);

/** Every day the grid draws, in order, without the days it leaves out. */
const drawnDays = (weeks: readonly (readonly (UnlockDay | null)[])[]) =>
  weeks.flat().filter((day): day is UnlockDay => day !== null);

const dayFor = (
  calendar: ReturnType<typeof buildUnlockCalendar>,
  daysAgo: number,
): UnlockDay | undefined => {
  const wanted = new Date(2026, 7, 26 - daysAgo).getTime();
  return drawnDays(calendar.weeks).find((day) => day.at === wanted);
};

describe("buildUnlockCalendar, the shape of the grid", () => {
  it("runs its rows from Monday to Sunday", () => {
    const opening = new Date(calendarOf(NOTHING).weeks[0]?.[0]?.at ?? 0);

    expect(opening.getDay()).toBe(1);
  });

  it("gives every week seven rows, whatever it has to put in them", () => {
    for (const week of calendarOf(NOTHING).weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it("ends on today", () => {
    const days = drawnDays(calendarOf(NOTHING).weeks);

    expect(days[days.length - 1]?.at).toBe(TODAY.getTime());
  });

  /**
   * A day that has not happened is not a day with nothing on it. Drawing it
   * empty would say the player unlocked nothing on a day they have not lived.
   */
  it("draws no day beyond today", () => {
    const weeks = calendarOf(NOTHING).weeks;
    const last = weeks[weeks.length - 1] ?? [];

    // Wednesday: Monday, Tuesday and today, then nothing.
    expect(last.slice(0, 3).every((day) => day !== null)).toBe(true);
    expect(last.slice(3)).toEqual([null, null, null, null]);
  });

  it("opens on a whole week however far back the window reaches", () => {
    for (const window of [3, 6, 12] as const) {
      const opening = new Date(calendarOf(NOTHING, window).weeks[0]?.[0]?.at ?? 0);
      expect(opening.getDay()).toBe(1);
    }
  });

  it("draws more of the year the longer the window is", () => {
    const weeksIn = (window: 3 | 6 | 12) => calendarOf(NOTHING, window).weeks.length;

    expect(weeksIn(3)).toBeLessThan(weeksIn(6));
    expect(weeksIn(6)).toBeLessThan(weeksIn(12));
    expect(weeksIn(12)).toBeGreaterThan(52);
  });

  it("names the month it opens on and the month it ends on", () => {
    const calendar = calendarOf(NOTHING);

    expect(calendar.from).toBe("aug 25");
    expect(calendar.to).toBe("aug 26");
  });
});

describe("buildUnlockCalendar, counting the unlocks", () => {
  it("counts a day's unlocks against that day", () => {
    const calendar = calendarOf(libraryUnlocking({ 3: 45 }));

    expect(dayFor(calendar, 3)?.count).toBe(45);
  });

  it("counts a day nothing was unlocked on as a day counting zero", () => {
    const calendar = calendarOf(libraryUnlocking({ 3: 45 }));

    expect(dayFor(calendar, 4)?.count).toBe(0);
  });

  /**
   * The calendar is the library's, not one game's: two games unlocked on the
   * same afternoon are one busy day, not two quiet ones.
   */
  it("adds up what every game was unlocked on the same day", () => {
    const calendar = calendarOf({
      2066020: unlocking({ 2: 3 }),
      2218750: unlocking({ 2: 4 }),
    });

    expect(dayFor(calendar, 2)?.count).toBe(7);
  });

  it("totals the days it draws", () => {
    const calendar = calendarOf(libraryUnlocking({ 0: 2, 5: 3, 40: 1 }));

    expect(calendar.total).toBe(6);
  });

  it("leaves out an unlock from before the window opened", () => {
    const before = secondsAt(new Date(2020, 0, 1, 12));
    const calendar = calendarOf({ 2066020: tallyOf([before]) }, 3);

    expect(calendar.total).toBe(0);
    expect(drawnDays(calendar.weeks).every((day) => day.count === 0)).toBe(true);
  });

  it("counts nothing when no tally has landed yet", () => {
    expect(calendarOf(NOTHING).total).toBe(0);
  });
});

describe("buildUnlockCalendar, the tone a day is drawn in", () => {
  /** Nine active days, so the quartiles land between distinct counts. */
  const SPREAD = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 45 };

  it("leaves a day with no unlocks below the palest tone", () => {
    expect(dayFor(calendarOf(libraryUnlocking(SPREAD)), 20)?.step).toBe(0);
  });

  it("climbs a step for each quartile a day is strictly above", () => {
    const calendar = calendarOf(libraryUnlocking(SPREAD));

    // Quartiles of 1..8 and 45 are 3, 5 and 7.
    expect(dayFor(calendar, 1)?.step).toBe(1);
    expect(dayFor(calendar, 4)?.step).toBe(2);
    expect(dayFor(calendar, 6)?.step).toBe(3);
    expect(dayFor(calendar, 9)?.step).toBe(4);
  });

  it("never climbs past the fourth tone", () => {
    const calendar = calendarOf(libraryUnlocking({ ...SPREAD, 10: 4000 }));

    expect(dayFor(calendar, 10)?.step).toBe(4);
  });

  /**
   * The degenerate library: every day the player unlocked on holds exactly one.
   * Strictly greater is what keeps them all on the palest tone instead of
   * declaring a quarter of them remarkable.
   */
  it("keeps a library that unlocked one a day on one tone", () => {
    const oneADay = Object.fromEntries(
      Array.from({ length: 30 }, (_unused, index) => [index + 1, 1]),
    );
    const calendar = calendarOf(libraryUnlocking(oneADay));

    const active = drawnDays(calendar.weeks).filter((day) => day.count > 0);
    expect(active).toHaveLength(30);
    expect(active.every((day) => day.step === 1)).toBe(true);
  });

  /**
   * Changing the duration is a zoom, not a repaint: a day has a colour of its
   * own, and a quiet day must not turn dark just because the busy months went
   * off screen.
   */
  it("reads its quartiles over twelve months whatever is on screen", () => {
    // The heavy days sit outside a three-month window and still set the scale:
    // read over three months alone, the busiest of the recent days would be a
    // top-quartile day rather than the modest one it is.
    const tallies = libraryUnlocking({
      5: 2, 10: 4, 15: 6, 20: 8,
      200: 40, 210: 60, 220: 80, 230: 100,
    });

    expect(dayFor(calendarOf(tallies, 12), 20)?.step).toBe(2);
    expect(dayFor(calendarOf(tallies, 3), 20)?.step).toBe(2);
  });
});

describe("describeWindow", () => {
  it("says how many unlocks the window holds, and how long it is", () => {
    expect(describeWindow(184, 12)).toBe("184 in 12 months");
    expect(describeWindow(9, 3)).toBe("9 in 3 months");
  });

  it("spaces the thousands, as every other figure in the app does", () => {
    expect(describeWindow(1284, 12)).toBe("1 284 in 12 months");
  });

  it("says a finished window is empty rather than writing a zero", () => {
    expect(describeWindow(0, 6)).toBe(EMPTY_WINDOW);
  });
});

describe("describeDay", () => {
  const dayOf = (count: number): UnlockDay => ({
    at: new Date(2025, 5, 20).getTime(),
    count,
    step: 1,
  });

  it("names the count and the day it belongs to", () => {
    expect(describeDay(dayOf(45))).toBe("45 unlocks · 20 jun 2025");
  });

  it("speaks of a single unlock in the singular", () => {
    expect(describeDay(dayOf(1))).toBe("1 unlock · 20 jun 2025");
  });

  it("says a quiet day had none rather than writing a zero", () => {
    expect(describeDay(dayOf(0))).toBe("no unlocks · 20 jun 2025");
  });
});
