import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

import { disagreements, type Palette } from "./agreement";
import { ASSETS, RECIPES, type Recipe } from "./recipes";
import { asMonochrome, stripProvenance, withoutPlate } from "./svg";

import { MARK_STOPS, MARK_TIP } from "../../../apps/mobile/src/theme/mark";
import { colors } from "../../../apps/mobile/src/theme/tokens";

/**
 * Rebuilds every PNG the app and the stores read, from the SVGs beside them.
 *
 * `--check` renders the same images and compares them against what is on disk
 * without writing anything, so a branch can be told that its artwork and its
 * images have parted company.
 */

/** The artwork is vector; this is what it is rasterised through. */
const DENSITY_AT_512 = 900;

const palette: Palette = {
  darkest: MARK_STOPS[0]?.color ?? "",
  lightest: MARK_STOPS[MARK_STOPS.length - 1]?.color ?? "",
  tip: MARK_TIP,
  hub: colors.accent,
};

const edited = (svg: string, recipe: Recipe): string => {
  let out = stripProvenance(svg);
  if (recipe.edits.includes("plate")) out = withoutPlate(out);
  if (recipe.edits.includes("monochrome")) out = asMonochrome(out);
  return out;
};

const render = async (recipe: Recipe): Promise<Buffer> => {
  const source = await readFile(join(ASSETS, recipe.from), "utf8");
  const svg = Buffer.from(edited(source, recipe));

  const image = sharp(svg, {
    density: Math.round((recipe.size / 512) * DENSITY_AT_512),
  }).resize(recipe.size, recipe.size);

  // Flattened onto the app's own ground rather than onto white, and stripped of
  // an alpha channel the App Store refuses on an icon.
  const ground = recipe.opaque
    ? image.flatten({ background: colors.bg }).removeAlpha()
    : image;

  return ground.png({ compressionLevel: 9 }).toBuffer();
};

const sameAsOnDisk = async (path: string, built: Buffer): Promise<boolean> => {
  try {
    return (await readFile(path)).equals(built);
  } catch {
    return false;
  }
};

const main = async (): Promise<void> => {
  const check = process.argv.includes("--check");

  // Read off the artwork that feeds the app icon: it is the one every other
  // piece is drawn from, and the one the component was written beside.
  const drift = disagreements(
    stripProvenance(await readFile(join(ASSETS, "icon.svg"), "utf8")),
    palette,
  );

  const stale: string[] = [];

  for (const recipe of RECIPES) {
    const built = await render(recipe);
    const path = join(ASSETS, recipe.out);

    if (check) {
      if (!(await sameAsOnDisk(path, built))) stale.push(recipe.out);
      continue;
    }

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, built);
    console.log(`${recipe.out.padEnd(34)} ${recipe.size}px  ← ${recipe.from}`);
  }

  if (drift.length > 0) {
    console.error(
      "\nThe artwork and src/theme/mark.ts have parted company:\n" +
        drift.map((line) => `  ${line}`).join("\n") +
        "\n\nThey are the same mark by two routes. Only how finely the ramp is\n" +
        "stepped is allowed to differ — 24 in the artwork, 12 in the component.",
    );
  }

  if (check && stale.length > 0) {
    console.error(
      `\n${stale.length} image(s) no longer match the artwork they came from:\n` +
        stale.map((out) => `  ${out}`).join("\n") +
        "\n\nRun `pnpm icons:build`.",
    );
  }

  if (drift.length > 0 || stale.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(check ? "Every image matches its artwork." : `\n${RECIPES.length} images written.`);
};

await main();
