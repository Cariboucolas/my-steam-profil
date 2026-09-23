/**
 * Keeps the two copies of the mark honest.
 *
 * The mark exists twice over. `apps/mobile/assets/*.svg` is the artwork these
 * images are rendered from; `apps/mobile/src/theme/mark.ts` is the same mark as
 * data, which the splash animates one stop at a time. Neither is derived from
 * the other, and they differ on purpose in exactly one respect: the artwork
 * steps the colour ramp twenty-four times where the component steps it twelve.
 * At the size where one hands over to the other that difference cannot be seen.
 *
 * Everything else about them has to match, and nothing else in the repository
 * would notice if it stopped. A colour changed on one side survives every test
 * there is and shows up only as a flicker at the handover — which is the kind
 * of fault that gets blamed on the animation for a week.
 */

export type Palette = {
  /** The first stop of the ramp. */
  readonly darkest: string;
  /** The last one before the tip closes it. */
  readonly lightest: string;
  readonly tip: string;
  readonly hub: string;
};

/** A stop is a stroked arc; the track is the one stroke that is not a colour. */
const STROKE = /stroke="(#[0-9a-f]{6})"/gi;
/** The tip is the only filled path; the hub the only filled circle. */
const FILLED_PATH = /<path\b[^>]*\bfill="(#[0-9a-f]{6})"/i;
const FILLED_CIRCLE = /<circle\b(?![^>]*fill="none")[^>]*\bfill="(#[0-9a-f]{6})"/i;

const first = (match: RegExpMatchArray | null): string =>
  (match?.[1] ?? "").toLowerCase();

/**
 * Reads the mark's palette off its artwork.
 *
 * The ramp's ends rather than the whole of it, because the whole of it is the
 * part the two copies are allowed to disagree about.
 */
export const paletteOf = (svg: string): Palette => {
  const strokes = [...svg.matchAll(STROKE)].map((m) => (m[1] ?? "").toLowerCase());
  const tip = first(svg.match(FILLED_PATH));

  // The tip is stroked as well as filled, and is not part of the ramp.
  const ramp = strokes.filter((colour) => colour !== tip);

  return {
    darkest: ramp[0] ?? "",
    lightest: ramp[ramp.length - 1] ?? "",
    tip,
    hub: first(svg.match(FILLED_CIRCLE)),
  };
};

/** What the artwork and the component disagree about, in words. */
export const disagreements = (svg: string, expected: Palette): string[] => {
  const found = paletteOf(svg);

  return (Object.keys(expected) as (keyof Palette)[])
    .filter((part) => found[part] !== expected[part].toLowerCase())
    .map(
      (part) =>
        `${part}: the artwork draws ${found[part] || "nothing"}, ` +
        `theme/mark.ts says ${expected[part]}`,
    );
};
