import type { GameDto } from "@steam/contracts";

import { type CountedUnlocks, calendarDayOf, countByDay, dayNumber } from "./unlock-days";

const GAME: GameDto = {
  appId: 1,
  name: "One",
  playtimeMinutes: 60,
  iconUrl: "https://icon/1.jpg",
  lastPlayedAt: null,
};

/** One game whose unlocks fell on these instants; null is one Steam will not date. */
const viewOf = (instants: readonly (string | null)[]): CountedUnlocks => ({
  games: [GAME],
  tallies: {
    [GAME.appId]: {
      completion: { unlocked: instants.length, total: 100, percentage: 0 },
      unlocks: instants.map((iso, index) => ({
        apiName: `ACH_${index}`,
        at: iso === null ? null : Date.parse(iso) / 1000,
      })),
    },
  },
});

/** The days are the device's own, so the assertions hold only in the zone the test script pins. */
beforeAll(() => {
  expect(new Date().getTimezoneOffset()).toBe(0);
});

describe("countByDay", () => {
  it("counts dated unlocks per day and leaves undated ones out", () => {
    const counts = countByDay(
      viewOf(["2025-06-20T08:00:00Z", "2025-06-20T23:30:00Z", "2025-06-21T00:30:00Z", null]),
    );

    expect(counts.get(dayNumber(2025, 5, 20))).toBe(2);
    expect(counts.get(dayNumber(2025, 5, 21))).toBe(1);
    expect([...counts.values()].reduce((sum, count) => sum + count, 0)).toBe(3);
  });

  it("ignores a tally for a game the library no longer holds", () => {
    const view = viewOf(["2025-06-20T08:00:00Z"]);
    expect(countByDay({ games: [], tallies: view.tallies }).size).toBe(0);
  });
});

describe("calendarDayOf", () => {
  it("reads a day number back as the calendar day it stands for", () => {
    expect(calendarDayOf(dayNumber(2024, 1, 29))).toEqual({ year: 2024, month: 1, day: 29 });
  });
});
