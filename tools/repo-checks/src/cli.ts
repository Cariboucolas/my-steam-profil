import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import {
  packagesWhoseTestsNeverRun,
  type SurveyedPackage,
} from "./uncollected-tests";

const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;

type ListedPackage = { readonly name: string; readonly path: string };

/** pnpm knows the workspace; walking the tree for package.json files guesses it. */
const listedPackages = (): readonly ListedPackage[] =>
  JSON.parse(
    execFileSync("pnpm", ["ls", "-r", "--depth", "-1", "--json"], {
      encoding: "utf8",
    }),
  ) as readonly ListedPackage[];

/**
 * Counts test files belonging to this package alone: a nested package is
 * surveyed in its own right, and counting its tests here would blame the
 * parent — the workspace root above all, which contains every other package.
 */
const countTestFilesUnder = (directory: string): number => {
  let found = 0;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

    const full = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (existsSync(join(full, "package.json"))) continue;
      found += countTestFilesUnder(full);
    } else if (TEST_FILE.test(entry.name)) {
      found += 1;
    }
  }

  return found;
};

const survey = (root: string): readonly SurveyedPackage[] =>
  listedPackages().map((listed) => {
    const manifest = JSON.parse(
      readFileSync(join(listed.path, "package.json"), "utf8"),
    ) as { readonly scripts?: Record<string, string> };

    return {
      name: listed.name,
      directory: relative(root, listed.path) || ".",
      runsTests: typeof manifest.scripts?.test === "string",
      testFileCount: countTestFilesUnder(listed.path),
    };
  });

const shortestPath = (packages: readonly ListedPackage[]): string =>
  packages.reduce(
    (shortest, one) => (one.path.length < shortest.length ? one.path : shortest),
    packages[0]?.path ?? process.cwd(),
  );

const uncollected = packagesWhoseTestsNeverRun(survey(shortestPath(listedPackages())));

if (uncollected.length === 0) {
  console.log("Every package carrying tests declares a test script.");
  process.exit(0);
}

console.error("These packages carry tests that `pnpm -r test` would never run:");
for (const one of uncollected) {
  console.error(
    `  ${one.name} (${one.directory}) — ${one.testFileCount} test file(s), no "test" script`,
  );
}
console.error('\nAdd a "test" script to each, or move the tests into a package that has one.');
process.exit(1);
