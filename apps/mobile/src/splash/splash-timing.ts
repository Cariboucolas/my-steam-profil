/**
 * When each part of the branded splash lands.
 *
 * Every figure here is read off the Claude Design mock (Splash Screen, option
 * 8C), where the arc is twelve colour stops revealed one after another rather
 * than a gradient swept along a path — SVG has no gradient that follows a
 * stroke, and the stepped reveal is what the design does about it.
 *
 * Timing lives apart from the components that obey it because it is the half
 * that can be reasoned about: a schedule is a handful of numbers and a clamp,
 * where a reveal is a tree of animated nodes.
 */

/** How many colour stops the arc is built from. */
export const MARK_STOP_COUNT = 12;

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
 * It is exactly as long as the sequence it protects: the wordmark's rise ends
 * here, and nothing is still moving when the stage gives way.
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
