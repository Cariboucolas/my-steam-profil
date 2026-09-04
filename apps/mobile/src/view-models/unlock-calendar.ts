import { MONTHS, type LibraryView } from "./library";

/**
 * Every row spans this many columns, whatever its month holds. Deriving a
 * cell's width from its own row would spread a four-day September across the
 * whole card, and the day axis would stop meaning anything.
 */
const COLUMNS = 31;

const MS_PER_SECOND = 1000;

/** One calendar day in the player's own time zone, and what it held. */
export type UnlockDay = { readonly count: number };

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
  /** Always 31 entries. A day that does not exist, or has not arrived, is null. */
  readonly days: readonly (UnlockDay | null)[];
};

export type UnlockCalendar = {
  readonly months: readonly UnlockMonth[];
};

/**
 * How many days a month really has. Day zero of the next month is the last day
 * of this one, which is also what makes February answer for a leap year without
 * being asked about one.
 */
const daysIn = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const keyOf = (month: number, day: number): string => `${month}-${day}`;

/**
 * How many unlocks fell on each day of `year`, read in the device's own time
 * zone: an unlock at half past eleven at night belongs to the day the player
 * would name, not to the one UTC has already moved on to.
 *
 * Only games the library still holds are counted, as the summary beside it
 * does, and only tallies that have arrived — the rest are still on their way.
 */
const countByDay = (
  view: LibraryView,
  year: number,
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();

  for (const game of view.games) {
    const tally = view.tallies[game.appId];
    if (!tally) continue;

    for (const seconds of tally.unlockedAt) {
      const moment = new Date(seconds * MS_PER_SECOND);
      // An earlier year, or the epoch Steam sends for an unlock it will not
      // date (ADR-0006), belongs to no day this calendar draws.
      if (moment.getFullYear() !== year) continue;

      const key = keyOf(moment.getMonth(), moment.getDate());
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return counts;
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
  const counts = countByDay(view, year);

  const months = Array.from({ length: currentMonth + 1 }, (_, month) => {
    const current = month === currentMonth;
    // The month in progress stops at today; every earlier one is complete.
    const lastDrawn = current ? now.getDate() : daysIn(year, month);

    return {
      label: (MONTHS[month] ?? "").toUpperCase(),
      current,
      days: Array.from({ length: COLUMNS }, (_, index) => {
        const day = index + 1;
        return day > lastDrawn
          ? null
          : { count: counts.get(keyOf(month, day)) ?? 0 };
      }),
    };
  });

  return { months };
};
