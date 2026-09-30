import type { Translate } from "../i18n/i18n";
import { buildUnlockCalendar, type UnlockCalendar } from "../view-models/unlock-calendar";
import { countedLibrary, unlockingLibrary } from "./library";

/** When the player of these fixtures started unlocking, unless a story says otherwise. */
const START_OF_LAST_YEAR = new Date(2025, 0, 1, 12);

/** The calendar a player unlocking since `since` sees on `today`. */
export const calendarOn = (
  today: Date,
  t: Translate,
  since: Date = START_OF_LAST_YEAR,
): UnlockCalendar => buildUnlockCalendar(unlockingLibrary(today, since), today, t);

/**
 * A library whose tallies carry no dated unlock at all: no active day to read
 * a scale from, so the legend is the unscaled one (ADR-0007).
 */
export const calendarWithNoUnlockDay = (today: Date, t: Translate): UnlockCalendar =>
  buildUnlockCalendar(countedLibrary, today, t);
