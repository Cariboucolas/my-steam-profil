import type { ScrolledGrid } from "./unlock-calendar-scroll";

/**
 * The December the three files testing the scroll read from either end: the
 * geometry itself, the hook that holds it, and the card that draws it. Twelve
 * month rows ten pixels tall with four pixels between them, which is the
 * shape a phone really gives them — and a fixture that drifted between the
 * three would have them agreeing about different cards.
 */

/** What the card leaves between two month rows. */
export const ROW_GAP = 4;

/** Twelve rows and the eleven gaps between them: 12 × 10 + 11 × 4. */
export const DECEMBER_HEIGHT = 164;

/** The six rows the card holds itself to: 6 × 10 + 5 × 4. */
export const SIX_ROWS = 80;

/** What is left to move once six of those twelve rows are in view. */
export const SCROLLED_PAST = 84;

/** That December, held to its six rows, moved `offset` down. */
export const december = (offset: number): ScrolledGrid => ({
  offset,
  viewport: SIX_ROWS,
  content: DECEMBER_HEIGHT,
});

/** A scroll, as the grid reports one. */
export const scrolledTo = (y: number) => ({
  nativeEvent: { contentOffset: { y } },
});
