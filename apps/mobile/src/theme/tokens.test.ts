import { colors, unlockToneFills } from "./tokens";

/**
 * The calendar's five tones are alpha over the page, so what a reader compares
 * is never the token: it is the token composed on `colors.bg`. Alpha says
 * nothing about that — `tileEmpty` and the palest gold sit 0.21 apart in alpha
 * and are the *closest* pair of the ramp once painted, while 0.25 and 0.5 sit
 * 0.25 apart and are the farthest. A ramp checked on its alphas can be evenly
 * spaced and unreadable, so this file paints first and measures after.
 */

type Rgb = readonly [number, number, number];

/**
 * `unlockToneFills` holds two notations — a hex for the opaque end of the ramp,
 * `rgba()` for everything composed over the page — so reading a fill means
 * accepting both.
 */
const parse = (fill: string): { readonly rgb: Rgb; readonly alpha: number } => {
  if (fill.startsWith("#")) {
    const packed = Number.parseInt(fill.slice(1), 16);
    return {
      rgb: [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255],
      alpha: 1,
    };
  }

  const [r, g, b, alpha] = fill
    .replace(/^rgba?\(|\)$/g, "")
    .split(",")
    .map((part) => Number(part));

  if (r === undefined || g === undefined || b === undefined) {
    throw new Error(`not a colour this test can read: ${fill}`);
  }

  return { rgb: [r, g, b], alpha: alpha ?? 1 };
};

const over = (fill: string, ground: Rgb): Rgb => {
  const { rgb, alpha } = parse(fill);
  const [r, g, b] = rgb;
  const [groundR, groundG, groundB] = ground;
  return [
    r * alpha + groundR * (1 - alpha),
    g * alpha + groundG * (1 - alpha),
    b * alpha + groundB * (1 - alpha),
  ];
};

/** sRGB is encoded for the eye, so it has to be undone before light adds up. */
const linear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/**
 * CIE lightness: the scale on which a difference of about 1 is the smallest a
 * reader can see between two large patches side by side. Relative luminance
 * alone will not do — it is linear in light, and the eye is not.
 */
const lightness = (rgb: Rgb): number => {
  const y =
    0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
  return y > 216 / 24389 ? 116 * y ** (1 / 3) - 16 : (24389 / 27) * y;
};

const painted = unlockToneFills.map((fill) =>
  lightness(over(fill, over(colors.bg, [0, 0, 0]))),
);

const neighbours = painted.flatMap((step, i) => {
  const paler = painted[i - 1];
  return paler === undefined ? [] : [{ from: i - 1, to: i, gap: step - paler }];
});

/**
 * What two neighbouring tones must differ by to be told apart. The ramp as
 * shipped clears this by a wide margin — its tightest pair is 12.9 — and it was
 * checked by eye on a phone at 375 dp, where all four golds separate. Ten is
 * not that measurement: it is the room below it that may be spent. A ramp
 * redrawn to sit under ten would be asking a reader to see a difference nobody
 * has ever confirmed is visible at a day cell's size (#29, #85).
 */
const LEAST_SEPARATION = 10;

describe("unlockToneFills", () => {
  it("keeps every neighbouring pair far enough apart to be told apart", () => {
    const tooClose = neighbours.filter(({ gap }) => gap < LEAST_SEPARATION);

    expect(tooClose).toEqual([]);
  });

  it("climbs, so a busier day is never painted paler than a quieter one", () => {
    const descending = neighbours.filter(({ gap }) => gap <= 0);

    expect(descending).toEqual([]);
  });
});
