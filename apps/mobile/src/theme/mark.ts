/**
 * The app's mark, as data.
 *
 * Here beside the tokens rather than inside the component that draws it,
 * because two unrelated things need it: `BrandMark`, which renders the stops,
 * and `splash-timing`, which says when each one lands and therefore has to know
 * how many there are. A count held in one and guarded by a test in the other is
 * the same fact written twice.
 */

/** One step of the arc's colour ramp, and how far round the circle it sits. */
export type MarkStop = {
  readonly color: string;
  readonly dashOffset: number;
};

/**
 * The arc, from the darkest amber to the lightest.
 *
 * SVG has no gradient that follows a stroke, so the design builds the ramp out
 * of overlapping dashes instead — each its own colour, each offset a little
 * further round. Drawn at once they read as one gradient; drawn one after
 * another they read as an arc filling.
 *
 * Twelve, as the design's animated variant has it. The static artwork in
 * `assets/icon.svg` draws the same ramp in twenty-four finer steps, which is
 * smoother in principle and indistinguishable at the sizes either is ever shown
 * at — including the 132 pt where the native splash hands over to this one.
 */
export const MARK_STOPS: readonly MarkStop[] = [
  { color: "#c98634", dashOffset: 0 },
  { color: "#cd8d3d", dashOffset: -47 },
  { color: "#d19347", dashOffset: -94.1 },
  { color: "#d59a50", dashOffset: -141.1 },
  { color: "#d9a05a", dashOffset: -188.1 },
  { color: "#dda763", dashOffset: -235.2 },
  { color: "#e2ae6c", dashOffset: -282.2 },
  { color: "#e6b476", dashOffset: -329.2 },
  { color: "#eabb7f", dashOffset: -376.3 },
  { color: "#eec189", dashOffset: -423.3 },
  { color: "#f2c892", dashOffset: -470.3 },
  { color: "#f6cf9b", dashOffset: -517.4 },
];

export const MARK_STOP_COUNT = MARK_STOPS.length;

/**
 * The unlit ring the arc is drawn over.
 *
 * Not `colors.track`, which is white at 7 % and is what a progress bar rests
 * on. This one is the accent's own colour dimmed, so the ring reads as the mark
 * unlit rather than as a gauge waiting to be filled.
 */
export const MARK_TRACK = "rgba(233,164,85,.16)";

/** The bright end of the arc, which the bevel is cut into. */
export const MARK_TIP = "#f8d2a0";
