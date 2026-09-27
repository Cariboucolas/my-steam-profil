/**
 * The day every story is drawn on unless it names another (#75). Frozen, so
 * the published gallery does not repaint itself each morning and a calendar
 * state stays reachable at the same address.
 *
 * Built from local parts rather than an ISO string: the calendar reads the
 * day in the device's own time zone, and midday keeps it the 25th wherever the
 * gallery or the test run happens to be.
 */
export const STORY_TODAY = new Date(2026, 5, 25, 12);

/** The first day of a year, which draws a calendar one row tall. */
export const FIRST_OF_JANUARY = new Date(2026, 0, 1, 12);

/** The last day of a year, which draws all twelve rows and has to scroll. */
export const LAST_DAY_OF_THE_YEAR = new Date(2026, 11, 31, 12);
