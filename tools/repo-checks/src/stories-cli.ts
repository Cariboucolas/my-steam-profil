import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { storyGaps } from "./missing-stories";

const APP = fileURLToPath(new URL("../../../apps/mobile", import.meta.url));
const COMPONENTS = join(APP, "src/components");
const EXCEPTIONS = join(APP, ".storybook/unstoried.json");

/** The levels owed a gallery. Pages are shown through their templates' stories (#75). */
const LEVELS = ["atoms", "molecules", "organisms", "templates"] as const;

const filesUnder = (directory: string): readonly string[] =>
  existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true, recursive: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(COMPONENTS, join(entry.parentPath, entry.name)))
    : [];

const files = LEVELS.flatMap((level) => filesUnder(join(COMPONENTS, level)));
const exceptions = JSON.parse(readFileSync(EXCEPTIONS, "utf8")) as readonly string[];
const exceptionsPath = relative(process.cwd(), EXCEPTIONS);

const { unstoried, staleExceptions } = storyGaps(files, exceptions);

if (unstoried.length > 0) {
  console.error("These components have no stories beside them:");
  for (const one of unstoried) console.error(`  src/components/${one}`);
  console.error("\nGive each a `.stories.tsx` next to it.");
}

if (staleExceptions.length > 0) {
  console.error(`These entries in ${exceptionsPath} forgive nothing any more:`);
  for (const one of staleExceptions) console.error(`  ${one}`);
  console.error("\nStrike them: the list only ever empties.");
}

if (unstoried.length === 0 && staleExceptions.length === 0) {
  console.log(`No component lacks stories beyond the ${exceptions.length} excepted in ${exceptionsPath}.`);
}

process.exit(unstoried.length > 0 || staleExceptions.length > 0 ? 1 : 0);
