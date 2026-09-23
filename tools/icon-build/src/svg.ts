/**
 * The three edits an icon source needs before it is rendered.
 *
 * All of them are string work on purpose. These are our own exports from one
 * design tool, with a shape we control; a parser would buy correctness against
 * SVG we never receive, and cost a dependency plus the chance of rewriting
 * attributes the renderer cared about.
 */

/** What Claude Design signs its exports with. */
const MANIFEST = /<metadata>[\s\S]*?<\/metadata>\s*/g;
const MANIFEST_NAMESPACE = /\s+xmlns:c2pa="[^"]*"/g;

/** The rounded plate the app icon sits on, opening or self-closing. */
const PLATE = /<rect\b[^>]*\/>|<rect\b[^>]*><\/rect>/g;

/** A colour written as six hex digits, in a stroke or a fill. */
const STROKE_HEX = /stroke="#[0-9a-f]{3,8}"/gi;
const FILL_HEX = /fill="#[0-9a-f]{3,8}"/gi;

/** The unlit ring: the accent dimmed, whatever its exact alpha. */
const TRACK = /rgba\(233,\s*164,\s*85,\s*([\d.]+)\)/g;

/**
 * Drops the provenance manifest Claude Design embeds.
 *
 * ~7.7 KB of signed base64 per file that changes no pixel, in files that are
 * otherwise small enough to read in a diff. What ships to a user is the PNG,
 * which carries no signature either way.
 */
export const stripProvenance = (svg: string): string =>
  svg.replace(MANIFEST, "").replace(MANIFEST_NAMESPACE, "");

/**
 * Removes the rounded plate, leaving the mark on nothing.
 *
 * For the splash, whose plugin paints `backgroundColor` behind the image it is
 * given: artwork carrying its own plate gets it drawn twice, and reads as a
 * rounded card floating on the ground rather than the mark sitting on it.
 *
 * Throws rather than returning something plausible. Both ways of getting this
 * wrong — handing it the adaptive background, which is only a plate, or artwork
 * that never had one — produce a canvas that renders perfectly well and is
 * simply empty or unchanged.
 */
export const withoutPlate = (svg: string): string => {
  const plates = svg.match(PLATE);
  if (plates === null) {
    throw new Error("no plate to remove: this artwork does not sit on one");
  }

  const bare = svg.replace(PLATE, "");
  if (!/<(circle|path|polygon|g)\b/.test(bare)) {
    throw new Error("nothing but a plate: removing it leaves an empty canvas");
  }

  return bare;
};

/**
 * Recolours the artwork to a white silhouette.
 *
 * Android's themed icons tint what they are given, so they want a shape rather
 * than a picture — left in colour, the system desaturates a twelve-stop amber
 * ramp into grey mush.
 *
 * The track keeps its own alpha rather than going white with the rest: it is
 * what makes the ring read as a ring instead of a disc, and the difference
 * between it and the arc over it is the whole of the mark.
 */
export const asMonochrome = (svg: string): string =>
  svg
    .replace(TRACK, (_, alpha: string) => `rgba(255,255,255,${alpha})`)
    .replace(STROKE_HEX, 'stroke="#fff"')
    .replace(FILL_HEX, 'fill="#fff"');
