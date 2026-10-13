import type { GameDto } from "@steam/contracts";

import { translatorFor } from "../i18n/i18n";
import { scaleValues } from "./chart-scale";
import type { UnlockToneScale } from "./tone-scale";
import type { CountedUnlocks } from "./unlock-days";
import { buildUnlockWeek, type UnlockWeek } from "./unlock-week";

const english = translatorFor("en");
const french = translatorFor("fr");

const game = (appId: number): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 60,
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt: null,
});

/**
 * A local instant, read the way the device reads it: built from local fields
 * rather than an ISO string, so the test says what the card does under any
 * time zone, not only the UTC the suite runs under.
 */
const at = (year: number, month: number, day: number, hour: number, minute = 30): number =>
  new Date(year, month - 1, day, hour, minute).getTime() / 1000;

// 18 April 2026 is a Saturday.
const SATURDAY_9PM = at(2026, 4, 18, 21);
const SUNDAY_3AM = at(2026, 4, 19, 3);
const MONDAY_10PM = at(2026, 4, 20, 22);
const WEDNESDAY_NOON = at(2026, 4, 22, 12);
const THURSDAY_7PM = at(2026, 4, 23, 19);

/** One game per list of instants; null is an unlock Steam will not date. */
const viewOf = (...perGame: readonly (readonly (number | null)[])[]): CountedUnlocks => ({
  games: perGame.map((_, index) => game(index + 1)),
  tallies: Object.fromEntries(
    perGame.map((instants, index) => [
      index + 1,
      {
        completion: { unlocked: instants.length, total: 100, percentage: 0 },
        unlocks: instants.map((instant, n) => ({ apiName: `ACH_${n}`, at: instant })),
      },
    ]),
  ),
});

/** `n` unlocks in the same hour, a minute apart, the last one at `minute`. */
const times = (n: number, year: number, month: number, day: number, hour: number): number[] =>
  Array.from({ length: n }, (_, index) => at(year, month, day, hour, index));

const drawn = (week: UnlockWeek) => {
  if (week.kind !== "drawn") throw new Error(`expected a drawn week, got ${week.kind}`);
  return week;
};

const countedIn = (view: CountedUnlocks, t = english, locale: "en" | "fr" = "en") =>
  drawn(buildUnlockWeek(view, true, locale, t, null));

/** Where the one non-empty cell of the grid sits, as [row, hour]. */
const litCells = (week: ReturnType<typeof drawn>): [number, number][] =>
  week.rows.flatMap((row, rowIndex) =>
    row.cells.flatMap((tone, hour): [number, number][] => (tone > 0 ? [[rowIndex, hour]] : [])),
  );

describe("buildUnlockWeek", () => {
  it("runs under a fixed zone, so the local fields the instants are built from are stable", () => {
    expect(new Date().getTimezoneOffset()).toBe(0);
  });

  describe("reading the slots", () => {
    it("puts a Saturday 9 pm unlock on Saturday's row at 9 pm, rows starting on Sunday in English", () => {
      const week = countedIn(viewOf([SATURDAY_9PM]));

      expect(week.rows.map((row) => row.label)).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
      expect(litCells(week)).toEqual([[6, 21]]);
      expect(week.busiestSlot).toBe("Sat 9pm");
    });

    it("starts the rows on Monday in French, so Saturday is the sixth", () => {
      const week = countedIn(viewOf([SATURDAY_9PM]), french, "fr");

      expect(week.rows.map((row) => row.label)).toEqual(["L", "M", "M", "J", "V", "S", "D"]);
      expect(week.rows.map((row) => row.day)).toEqual([1, 2, 3, 4, 5, 6, 0]);
      expect(litCells(week)).toEqual([[5, 21]]);
      expect(week.busiestSlot).toBe("sam. 21h");
    });

    it("counts no undated unlock and no game gone from the library", () => {
      const view = viewOf([SATURDAY_9PM, null]);
      const withAStranger: CountedUnlocks = {
        games: view.games,
        tallies: {
          ...view.tallies,
          99: {
            completion: { unlocked: 1, total: 1, percentage: 100 },
            unlocks: [{ apiName: "GONE", at: WEDNESDAY_NOON }],
          },
        },
      };
      const week = countedIn(withAStranger);

      expect(litCells(week)).toEqual([[6, 21]]);
      expect(week.hours[21]?.figure).toBe("1");
      // Shares are of dated unlocks: the one dated unlock is the whole evening.
      expect(week.shares?.[0]?.value).toBe("100%");
    });
  });

  describe("the busiest slot and the busiest hour", () => {
    it("tells them apart when one hour is spread over several days", () => {
      const week = countedIn(
        viewOf([
          ...times(3, 2026, 4, 18, 21), // Saturday 9 pm: 3
          ...times(2, 2026, 4, 20, 20), // Monday 8 pm: 2
          ...times(2, 2026, 4, 21, 20), // Tuesday 8 pm: 2
        ]),
      );

      expect(week.busiestSlot).toBe("Sat 9pm");
      expect(week.hours.findIndex((hour) => hour.busiest)).toBe(20);
      expect(week.hours[20]?.figure).toBe("4");
      expect(week.hours.filter((hour) => hour.figure !== null)).toHaveLength(1);
    });

    it("breaks a tie for the one whose latest unlock is the more recent", () => {
      const week = countedIn(
        viewOf([
          ...times(2, 2025, 6, 7, 21), // Saturday 9 pm, last year
          ...times(2, 2026, 4, 20, 10), // Monday 10 am, this year
        ]),
      );

      expect(week.busiestSlot).toBe("Mon 10am");
      expect(week.hours.findIndex((hour) => hour.busiest)).toBe(10);
    });

    it("draws every hour against the busiest one", () => {
      const week = countedIn(viewOf([...times(4, 2026, 4, 18, 21), ...times(1, 2026, 4, 18, 9)]));

      expect(week.hours[21]?.share).toBe(1);
      expect(week.hours[9]?.share).toBe(0.25);
      expect(week.hours[0]?.share).toBe(0);
    });

    it("ticks the axis every other hour, in the Locale's hours", () => {
      expect(
        countedIn(viewOf([SATURDAY_9PM]))
          .hours.map((hour) => hour.tick)
          .filter(Boolean),
      ).toEqual([
        "12am",
        "2am",
        "4am",
        "6am",
        "8am",
        "10am",
        "12pm",
        "2pm",
        "4pm",
        "6pm",
        "8pm",
        "10pm",
      ]);
      expect(
        countedIn(viewOf([SATURDAY_9PM]), french, "fr")
          .hours.map((hour) => hour.tick)
          .filter(Boolean),
      ).toEqual(["0h", "2h", "4h", "6h", "8h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"]);
    });

    it("rules the guide lines on round steps of the busiest hour's total", () => {
      const week = countedIn(viewOf(times(7, 2026, 4, 18, 21)));

      expect(week.scale).toEqual(
        scaleValues(7).map((value) => ({ label: String(value), share: value / 7 })),
      );
    });
  });

  describe("the three shares", () => {
    const FIVE = viewOf([SATURDAY_9PM, SUNDAY_3AM, MONDAY_10PM, WEDNESDAY_NOON, THURSDAY_7PM]);

    it("states the evening, the weekend and the night as shares of the dated unlocks", () => {
      expect(countedIn(FIVE).shares).toEqual([
        { value: "60%", label: "between 6 pm and midnight" },
        { value: "40%", label: "at the weekend" },
        { value: "20%", label: "between midnight and 6 am" },
      ]);
    });

    it("keeps the weekend to Saturday and Sunday in a week that starts on Monday", () => {
      expect(countedIn(FIVE, french, "fr").shares).toEqual([
        { value: "60 %", label: "entre 18 h et minuit" },
        { value: "40 %", label: "le week-end" },
        { value: "20 %", label: "entre minuit et 6 h" },
      ]);
    });

    it("says all of it to a screen reader in one sentence", () => {
      expect(countedIn(FIVE).screenReaderLabel).toBe(
        // Every slot holds one: the latest, Thursday 7 pm, breaks the tie for slot and hour alike.
        "Busiest slot: Thursday 7pm. Busiest hour: 7pm, 1 unlock. 60% in the evening, 40% at the weekend, 20% at night.",
      );
    });
  });

  describe("while counting", () => {
    it("waits while nothing dated has landed", () => {
      expect(buildUnlockWeek(viewOf([null]), false, "en", english, null)).toEqual({
        kind: "waiting",
      });
      expect(
        buildUnlockWeek({ games: [game(1)], tallies: {} }, false, "en", english, null),
      ).toEqual({
        kind: "waiting",
      });
    });

    it("is empty once counted with nothing dated", () => {
      expect(buildUnlockWeek(viewOf([null]), true, "en", english, null)).toEqual({ kind: "empty" });
    });

    it("draws the grid and the hours but holds back the slot and the shares", () => {
      const week = drawn(buildUnlockWeek(viewOf([SATURDAY_9PM]), false, "en", english, null));

      expect(litCells(week)).toEqual([[6, 21]]);
      expect(week.busiestSlot).toBeNull();
      expect(week.shares).toBeNull();
      expect(week.screenReaderLabel).toBe("Busiest hour so far: 9pm, 1 unlock.");
    });

    it("draws against the scale it is handed, the very one", () => {
      const held: UnlockToneScale = [5, 10, 20];
      const week = drawn(buildUnlockWeek(viewOf([SATURDAY_9PM]), false, "en", english, held));

      expect(week.toneScale).toBe(held);
      expect(week.legend.map((band) => band.label)).toEqual(["0", "1-5", "6-10", "11-20", "21+"]);
    });

    it("reads its own scale once counted, whatever it was handed", () => {
      const week = drawn(buildUnlockWeek(viewOf([SATURDAY_9PM]), true, "en", english, [5, 10, 20]));

      expect(week.legend.map((band) => band.label)).toEqual(["0", "1", "2", "3", "4+"]);
    });
  });
});
