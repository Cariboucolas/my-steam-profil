import { describe, expect, it } from "vitest";

import { disagreements, paletteOf } from "./agreement";

const PALETTE = {
  darkest: "#c98634",
  lightest: "#f6cf9b",
  tip: "#f8d2a0",
  hub: "#e9a455",
};

const artwork = (stops: string[], tip: string, hub: string): string =>
  `<svg viewBox="0 0 512 512">
     <circle r="132" fill="none" stroke="rgba(233,164,85,.16)" stroke-width="52"/>
     ${stops.map((c) => `<circle r="132" fill="none" stroke="${c}" stroke-width="52" stroke-linecap="round"/>`).join("")}
     <circle r="132" fill="none" stroke="${tip}" stroke-width="52"/>
     <path d="M256 98 284 124 256 150Z" fill="${tip}"/>
     <circle r="30" fill="${hub}"/>
   </svg>`;

const agreeing = artwork(
  [PALETTE.darkest, "#d9a05a", PALETTE.lightest],
  PALETTE.tip,
  PALETTE.hub,
);

describe("paletteOf", () => {
  it("reads the ramp's two ends off the artwork", () => {
    const found = paletteOf(agreeing);

    expect(found.darkest).toBe(PALETTE.darkest);
    expect(found.lightest).toBe(PALETTE.lightest);
  });

  /** The hub is the only filled circle; the tip is the only filled path. */
  it("tells the hub from the tip", () => {
    const found = paletteOf(agreeing);

    expect(found.hub).toBe(PALETTE.hub);
    expect(found.tip).toBe(PALETTE.tip);
  });

  /** The track is not a ramp stop, and must not be read as its darkest end. */
  it("does not mistake the unlit ring for the start of the ramp", () => {
    expect(paletteOf(agreeing).darkest).not.toContain("233,164,85");
  });
});

describe("disagreements", () => {
  /**
   * The mark exists twice: as the artwork these images are rendered from, and
   * as `src/theme/mark.ts`, which the splash animates a stop at a time. They
   * differ by design in how finely the ramp is stepped — and must not differ in
   * anything else.
   *
   * Nothing else in the repository would notice if they did. A colour changed
   * in one and not the other passes every test and shows up as a flicker at the
   * moment the native splash hands over to the component.
   */
  it("finds nothing when the two agree", () => {
    expect(disagreements(agreeing, PALETTE)).toEqual([]);
  });

  it("catches a ramp that starts somewhere else", () => {
    const drifted = artwork(["#000000", PALETTE.lightest], PALETTE.tip, PALETTE.hub);

    expect(disagreements(drifted, PALETTE).join(" ")).toMatch(/darkest/i);
  });

  it("catches a ramp that ends somewhere else", () => {
    const drifted = artwork([PALETTE.darkest, "#ffffff"], PALETTE.tip, PALETTE.hub);

    expect(disagreements(drifted, PALETTE).join(" ")).toMatch(/lightest/i);
  });

  it("catches a tip that moved", () => {
    const drifted = artwork([PALETTE.darkest, PALETTE.lightest], "#123456", PALETTE.hub);

    expect(disagreements(drifted, PALETTE).join(" ")).toMatch(/tip/i);
  });

  it("catches a hub that moved", () => {
    const drifted = artwork([PALETTE.darkest, PALETTE.lightest], PALETTE.tip, "#123456");

    expect(disagreements(drifted, PALETTE).join(" ")).toMatch(/hub/i);
  });

  /** Both sides of a drift are worth naming, so the reader knows which to fix. */
  it("says what it found and what it wanted", () => {
    const drifted = artwork(["#000000", PALETTE.lightest], PALETTE.tip, PALETTE.hub);

    const said = disagreements(drifted, PALETTE).join(" ");

    expect(said).toContain("#000000");
    expect(said).toContain(PALETTE.darkest);
  });

  /**
   * The two ramps are twenty-four steps and twelve. That is the one difference
   * that is deliberate, and it must not be reported as drift.
   */
  it("does not care how finely the ramp is stepped", () => {
    const fine = artwork(
      [PALETTE.darkest, "#cd8d3d", "#d19347", "#d59a50", PALETTE.lightest],
      PALETTE.tip,
      PALETTE.hub,
    );

    expect(disagreements(fine, PALETTE)).toEqual([]);
  });
});
