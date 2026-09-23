import { describe, expect, it } from "vitest";

import { asMonochrome, stripProvenance, withoutPlate } from "./svg";

const PLATE = `<rect width="512" height="512" rx="112" fill="#0b0f14"></rect>`;
const RING = `<circle cx="256" cy="256" r="132" fill="none" stroke="#c98634" stroke-width="52"></circle>`;
const HUB = `<circle cx="256" cy="256" r="30" fill="#e9a455"></circle>`;

const svg = (body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}</svg>`;

describe("stripProvenance", () => {
  /**
   * Claude Design signs what it exports. The manifest is ~7.7 KB of base64 per
   * file and changes no pixel, so it is dropped from a build source the same
   * way a comment would be.
   */
  it("drops the C2PA manifest", () => {
    const signed = svg(`<metadata><c2pa:manifest>AAAA</c2pa:manifest></metadata>${RING}`);

    const stripped = stripProvenance(signed);

    expect(stripped).not.toContain("c2pa:manifest");
    expect(stripped).toContain(RING);
  });

  it("drops the namespace the manifest declared", () => {
    const signed = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:c2pa="http://c2pa.org/manifest">${RING}</svg>`;

    expect(stripProvenance(signed)).not.toContain("c2pa");
  });

  /** A source that was already clean must come through untouched. */
  it("leaves a file that carries no manifest exactly as it is", () => {
    const clean = svg(RING);

    expect(stripProvenance(clean)).toBe(clean);
  });
});

describe("withoutPlate", () => {
  /**
   * The splash plugin paints `backgroundColor` behind the image it is given, so
   * an artwork that carries its own plate has it drawn twice — a rounded card
   * floating on the ground rather than the mark sitting on it.
   */
  it("removes the rounded plate the icon sits on", () => {
    const withPlate = svg(`${PLATE}${RING}${HUB}`);

    const bare = withoutPlate(withPlate);

    expect(bare).not.toContain("<rect");
    expect(bare).toContain(RING);
    expect(bare).toContain(HUB);
  });

  it("removes a self-closing plate too", () => {
    const withPlate = svg(`<rect width="512" height="512" rx="112" fill="#0b0f14"/>${RING}`);

    expect(withoutPlate(withPlate)).not.toContain("<rect");
  });

  /**
   * The adaptive background is a bare plate and nothing else. Handing it here
   * would leave an empty canvas, which is a mistake worth refusing rather than
   * rendering.
   */
  it("refuses artwork that is nothing but its plate", () => {
    expect(() => withoutPlate(svg(PLATE))).toThrow(/nothing but/i);
  });

  it("refuses artwork that has no plate to remove", () => {
    expect(() => withoutPlate(svg(RING))).toThrow(/no plate/i);
  });
});

describe("asMonochrome", () => {
  /**
   * Android tints the themed icon itself, so it wants a silhouette. Left as it
   * is, the system desaturates a twelve-stop amber ramp into grey mush.
   */
  it("turns every stroke white", () => {
    const mono = asMonochrome(svg(RING));

    expect(mono).toContain('stroke="#fff"');
    expect(mono).not.toContain("#c98634");
  });

  it("turns every fill white", () => {
    const mono = asMonochrome(svg(HUB));

    expect(mono).toContain('fill="#fff"');
    expect(mono).not.toContain("#e9a455");
  });

  /** `fill="none"` says there is nothing to paint, not that it is a colour. */
  it("leaves an absent fill absent", () => {
    expect(asMonochrome(svg(RING))).toContain('fill="none"');
  });

  /**
   * The unlit ring has to stay dimmer than the arc drawn over it, or the
   * silhouette is a solid disc with no mark in it.
   */
  it("keeps the track dimmer than what is drawn over it", () => {
    const track = `<circle stroke="rgba(233,164,85,.16)" stroke-width="52"></circle>`;
    const mono = asMonochrome(svg(`${track}${RING}`));

    expect(mono).toContain("rgba(255,255,255,");
    expect(mono).not.toContain("233,164,85");
  });
});
