/**
 * When each part of the branded splash lands.
 *
 * The arc's figures are the Claude Design mock's (Splash Screen, option 8C),
 * unchanged: twelve stops revealed one after another rather than a gradient
 * swept along a path, because SVG has no gradient that follows a stroke.
 *
 * The wordmark's are not. The mock rises it at 750 ms over 500, landing at
 * 1250 — a mock has no startup budget to answer to, and a launch does. The
 * floor below is the budget, so the rise was moved to land on it rather than
 * 350 ms past it, where every launch would either wait for a title still
 * moving or cut it off mid-rise. Its shape is the mock's: a rise beginning
 * under a mark that is still drawing.
 *
 * Timing lives apart from the components that obey it because it is the half
 * that can be reasoned about: a schedule is a handful of numbers and a clamp,
 * where a reveal is a tree of animated nodes.
 */

import { MARK_STOP_COUNT } from "../theme/mark";

/** When the first stop appears, leaving a beat before anything moves. */
export const FIRST_STOP_MS = 100;

/** How long each stop waits for the one before it. */
export const STOP_INTERVAL_MS = 60;

/**
 * When the bright tip and its bevel close the arc: one interval after the last
 * stop, so the mark is full before it is finished.
 */
export const REVEAL_MS =
  FIRST_STOP_MS + STOP_INTERVAL_MS * (MARK_STOP_COUNT - 1) + STOP_INTERVAL_MS;

/** When the wordmark starts rising, under a mark that is still drawing. */
export const WORDMARK_DELAY_MS = 600;

/** How long that rise takes. */
export const WORDMARK_RISE_MS = 300;

/**
 * The shortest the branded stage may last.
 *
 * The stage waits on real work — the fonts, and the device store's answer about
 * which profile to show — but a warm start finishes that in a couple of hundred
 * milliseconds. Ending the stage there would cut the mark off part-drawn, which
 * reads as a glitch rather than as a fast launch. So the stage waits for the
 * work *and* for this, whichever is longer.
 *
 * Nine hundred milliseconds is the budget, chosen first and on its own: long
 * enough that the arc (820 ms) is whole, short enough to be worth paying on a
 * launch that needed none of it. The wordmark was then timed to land on it —
 * which is why the sum below comes out exactly here, and not the other way
 * round. Nothing is still moving when the stage gives way.
 */
export const HOLD_MS = WORDMARK_DELAY_MS + WORDMARK_RISE_MS;

/**
 * The shortest the stage may last, given what the device was asked about
 * motion.
 *
 * Someone who has asked for less motion is not asking to wait longer for it:
 * there is no reveal to protect, so there is nothing to hold for. While the
 * device has yet to answer, the stage holds — a stage held a moment too long
 * is invisible, where motion shown to someone who asked for none is the whole
 * of what the setting exists to prevent.
 */
export const holdFor = (reduceMotion: boolean | undefined): number =>
  reduceMotion === true ? 0 : HOLD_MS;

/** How many of the arc's stops are drawn, this far into the stage. */
export const stopsShownAt = (elapsedMs: number): number => {
  const due = Math.floor((elapsedMs - FIRST_STOP_MS) / STOP_INTERVAL_MS) + 1;
  return Math.min(MARK_STOP_COUNT, Math.max(0, due));
};

/** Whether the bright tip has closed the arc, this far into the stage. */
export const tipIsShownAt = (elapsedMs: number): boolean => elapsedMs >= REVEAL_MS;
