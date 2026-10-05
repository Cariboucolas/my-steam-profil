import type { LibraryView } from "./library";

export const MS_PER_SECOND = 1000;
export const MS_PER_DAY = 86_400_000;

/**
 * What a count of unlocks by day reads: the library's games and the tallies
 * that have landed. The rest of a LibraryView is about the list, not the days.
 */
export type CountedUnlocks = Pick<LibraryView, "games" | "tallies">;

/** One integer per calendar day, so two days can be compared and subtracted. */
export const dayNumber = (year: number, month: number, day: number): number =>
  Date.UTC(year, month, day) / MS_PER_DAY;

/**
 * Which day a moment fell on, read in the device's own time zone: an unlock at
 * half past eleven at night belongs to the day the player would name, not to
 * the one UTC has already moved on to.
 */
export const dayNumberOf = (moment: Date): number =>
  dayNumber(moment.getFullYear(), moment.getMonth(), moment.getDate());

/**
 * How many unlocks fell on each day the player has ever had one, whatever year
 * it belongs to. The grid draws a single year and the tone scale reads a window
 * that overruns it, so nothing is thrown away by date here.
 *
 * Only games the library still holds are counted, as the summary beside it
 * does, and only tallies that have arrived — the rest are still on their way.
 */
export const countByDay = (view: CountedUnlocks): ReadonlyMap<number, number> => {
  const counts = new Map<number, number>();

  for (const game of view.games) {
    const tally = view.tallies[game.appId];
    if (!tally) continue;

    for (const unlock of tally.unlocks) {
      // An unlock Steam will not date is a real unlock with no day to draw it
      // on, and inventing one would put it in a month it never happened in.
      if (unlock.at === null) continue;
      const day = dayNumberOf(new Date(unlock.at * MS_PER_SECOND));
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  }

  return counts;
};

/**
 * The calendar day a day number stands for. `dayNumber` writes the local
 * calendar day as a UTC midnight, so it reads back with the UTC getters.
 */
export const calendarDayOf = (
  day: number,
): { readonly year: number; readonly month: number; readonly day: number } => {
  const midnight = new Date(day * MS_PER_DAY);
  return {
    year: midnight.getUTCFullYear(),
    month: midnight.getUTCMonth(),
    day: midnight.getUTCDate(),
  };
};
