import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ASSETS, RECIPES, type Recipe } from "./recipes";

const recipeFor = (out: string): Recipe | undefined =>
  RECIPES.find((r) => r.out === out);

/** Every image path `app.json` hands to Expo, wherever it names one. */
const imagesExpoReads = (): string[] => {
  const manifest = readFileSync(`${ASSETS}/../app.json`, "utf8");
  return [...manifest.matchAll(/"\.\/assets\/([^"]+\.png)"/g)].map((m) => m[1] as string);
};

describe("the recipes against app.json", () => {
  /**
   * The point of the command. An asset Expo asks for that nothing here builds
   * is the state this whole tool exists to end: a file in the tree that only
   * one person knows how to remake.
   */
  it("builds every image the manifest asks for", () => {
    const missing = imagesExpoReads().filter((image) => recipeFor(image) === undefined);

    expect(missing).toEqual([]);
  });

  /** And the reverse: a recipe nothing reads is work nobody asked for. */
  it("says what reads each thing it builds", () => {
    for (const recipe of RECIPES) {
      expect(recipe.reads.length).toBeGreaterThan(0);
    }
  });
});

describe("the traps the recipes encode", () => {
  /**
   * Both OSes mask the app icon themselves. `icon.svg` carries its own rounded
   * plate, so feeding it here gives a double-rounded icon with transparent
   * corners — which the App Store refuses outright.
   */
  it("takes the app icon from the square artwork, opaque", () => {
    const icon = recipeFor("icon.png");

    expect(icon?.from).toBe("icon-square.svg");
    expect(icon?.opaque).toBe(true);
  });

  /**
   * The splash plugin paints the background itself, so the artwork must arrive
   * without one — and it is the rounded `icon.svg` that has the plate to lose.
   */
  it("takes the splash from the rounded artwork with its plate removed", () => {
    const splash = recipeFor("splash-icon.png");

    expect(splash?.from).toBe("icon.svg");
    expect(splash?.edits).toContain("plate");
    expect(splash?.opaque).toBe(false);
  });

  /** The adaptive foreground is drawn larger on purpose, to fill the safe zone. */
  it("takes the adaptive foreground from the artwork scaled for it", () => {
    expect(recipeFor("android-icon-foreground.png")?.from).toBe(
      "adaptive-foreground.svg",
    );
  });

  /** Android tints the themed icon, so it wants a silhouette, not a picture. */
  it("derives the monochrome layer rather than shipping the colour one", () => {
    const mono = recipeFor("android-icon-monochrome.png");

    expect(mono?.from).toBe("adaptive-foreground.svg");
    expect(mono?.edits).toContain("monochrome");
  });

  /**
   * A layer that is meant to sit behind another cannot be see-through, and one
   * meant to sit on top cannot be opaque.
   */
  it("keeps the adaptive layers the right way round", () => {
    expect(recipeFor("android-icon-background.png")?.opaque).toBe(true);
    expect(recipeFor("android-icon-foreground.png")?.opaque).toBe(false);
  });
});

describe("sizes", () => {
  /**
   * Expo scales down and never up, and a store may ask for the largest of
   * these, so what Expo reads is rendered at the size the store wants.
   */
  it("renders what Expo reads big enough for a store", () => {
    const stores = ["icon.png", "android-icon-foreground.png", "splash-icon.png"];

    for (const out of stores) {
      expect(recipeFor(out)?.size).toBe(1024);
    }
  });

  it("builds the hand sizes a listing or a web page asks for", () => {
    const hand = RECIPES.filter((r) => r.out.startsWith("png/"));

    expect(hand.map((r) => r.size).sort((a, b) => a - b)).toEqual([
      16, 32, 48, 64, 180, 192, 432, 432, 512, 512, 512,
    ]);
  });
});
