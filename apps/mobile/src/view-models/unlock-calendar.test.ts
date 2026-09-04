import type { GameDto, GameTallyDto } from "@steam/contracts";

import type { LibraryView } from "./library";
import {
  buildUnlockCalendar,
  type UnlockCalendar,
  type UnlockDay,
  type UnlockMonth,
} from "./unlock-calendar";

const SOULSTONE = 2066020;
const HALLS = 2218750;

const game = (appId: number): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 120,
  playtimeLabel: "2 h",
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt: null,
});

/** Only the dates decide a calendar, so the completion half stays nominal. */
const tally = (unlockedAt: readonly number[]): GameTallyDto => ({
  completion: { unlocked: unlockedAt.length, total: 100, percentage: 0 },
  unlockedAt,
});

/** Epoch seconds, as the wire carries them. */
const at = (iso: string): number => Date.parse(iso) / 1000;

/**
 * A library of two games. A game named here has been counted; one left out has
 * a tally still on its way, as it would mid-load.
 */
const libraryWhereUnlocksHappened = (
  unlocks: Readonly<Record<number, readonly string[]>> = {},
): LibraryView => ({
  games: [game(SOULSTONE), game(HALLS)],
  tallies: Object.fromEntries(
    Object.entries(unlocks).map(([appId, instants]) => [
      Number(appId),
      tally(instants.map(at)),
    ]),
  ),
  sort: "completed",
  pending: new Set<number>(),
  frozenOrder: null,
});

const rowFor = (calendar: UnlockCalendar, label: string): UnlockMonth => {
  const month = calendar.months.find((one) => one.label === label);
  if (!month) throw new Error(`no ${label} row in the calendar`);
  return month;
};

/** The days a row really draws, out of the thirty-one columns it always has. */
const drawn = (month: UnlockMonth): readonly UnlockDay[] =>
  month.days.filter((day): day is UnlockDay => day !== null);

/** Everything the calendar says the player unlocked, across every row. */
const totalOf = (calendar: UnlockCalendar): number =>
  calendar.months
    .flatMap((month) => drawn(month))
    .reduce((sum, day) => sum + day.count, 0);

/**
 * An UnlockDay is a day in the player's own time zone, and the epoch seconds
 * crossing the wire are not — so the zone the assertions below are written in
 * has to be the zone they run in. The package's test script pins TZ=UTC;
 * setting it from inside the file would not work, as Jest hands the test a copy
 * of `process.env` that V8 never sees. This fails loudly rather than letting a
 * run in another zone quietly agree with the wrong day.
 */
beforeAll(() => {
  expect(new Date().getTimezoneOffset()).toBe(0);
});

describe("buildUnlockCalendar", () => {
  it("draws a row for every month up to the one today falls in", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(calendar.months.map((month) => month.label)).toEqual([
      "JAN",
      "FEB",
      "MAR",
      "APR",
    ]);
  });

  it("draws no day the player has not lived through yet", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2026-04-17T10:00:00Z"),
    );
    const april = rowFor(calendar, "APR");

    // Thirty-one columns whatever the month holds: a day has to sit under the
    // same day in every row, or the day axis says nothing.
    expect(april.days).toHaveLength(31);
    expect(drawn(april)).toHaveLength(17);
    // A day already lived through with nothing on it is a real day counting zero.
    expect(april.days[16]).toEqual({ count: 0 });
  });

  it("never draws a day that did not exist", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2026-12-31T10:00:00Z"),
    );

    expect(drawn(rowFor(calendar, "FEB"))).toHaveLength(28);
    expect(drawn(rowFor(calendar, "APR"))).toHaveLength(30);
    expect(drawn(rowFor(calendar, "SEP"))).toHaveLength(30);
    expect(drawn(rowFor(calendar, "NOV"))).toHaveLength(30);
    expect(drawn(rowFor(calendar, "DEC"))).toHaveLength(31);
  });

  it("draws the 29th of February in a leap year", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2028-03-10T10:00:00Z"),
    );

    expect(drawn(rowFor(calendar, "FEB"))).toHaveLength(29);
  });

  it("counts a day's unlocks across every game already counted", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({
        [SOULSTONE]: ["2026-04-05T09:00:00Z", "2026-04-05T22:10:00Z"],
        [HALLS]: ["2026-04-05T11:00:00Z", "2026-04-06T11:00:00Z"],
      }),
      new Date("2026-04-17T10:00:00Z"),
    );
    const april = rowFor(calendar, "APR");

    expect(april.days[4]).toEqual({ count: 3 });
    expect(april.days[5]).toEqual({ count: 1 });
  });

  /** The grid fills as the waves of tallies land, rather than waiting for them. */
  it("counts what has arrived and waits for the rest", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({ [SOULSTONE]: ["2026-04-05T09:00:00Z"] }),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(rowFor(calendar, "APR").days[4]).toEqual({ count: 1 });
    expect(totalOf(calendar)).toBe(1);
  });

  it("puts a late evening unlock on the day the player would call it", () => {
    // Half past eleven at night, half an hour from a different date. A day is
    // the player's own day, so this one is the 14th and not the 15th.
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({ [SOULSTONE]: ["2026-03-14T23:30:00Z"] }),
      new Date("2026-04-17T10:00:00Z"),
    );
    const march = rowFor(calendar, "MAR");

    expect(march.days[13]).toEqual({ count: 1 });
    expect(march.days[14]).toEqual({ count: 0 });
  });

  it("draws nothing for an unlock outside the year it shows", () => {
    // The epoch is what Steam sends for an achievement it will not date.
    // ADR-0006 keeps those out of `unlockedAt`, and 1970 is no day of this year
    // either way.
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({
        [SOULSTONE]: ["1970-01-01T00:00:00Z", "2025-12-31T20:00:00Z"],
      }),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(totalOf(calendar)).toBe(0);
  });

  /** The row's label is picked out for it; the card does not work out which. */
  it("names the month today falls in", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(calendar.months.map((month) => month.current)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });
});
