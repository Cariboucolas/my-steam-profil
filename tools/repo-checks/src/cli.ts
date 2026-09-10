import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { testFilesTheRouterWouldPublish } from "./published-tests";
import {
  packagesWhoseTestsNeverRun,
  type SurveyedPackage,
} from "./uncollected-tests";

const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;

/** The one marker that names an Expo Router app without naming this app. */
const ROUTER_ENTRY = "expo-router/entry";

type ListedPackage = { readonly name: string; readonly path: string };

/** pnpm knows the workspace; walking the tree for package.json files guesses it. */
const listedPackages = (): readonly ListedPackage[] =>
  JSON.parse(
    execFileSync("pnpm", ["ls", "-r", "--depth", "-1", "--json"], {
      encoding: "utf8",
    }),
  ) as readonly ListedPackage[];

const manifestOf = (directory: string): { readonly main?: string; readonly scripts?: Record<string, string> } =>
  JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));

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
  listedPackages().map((listed) => ({
    name: listed.name,
    directory: relative(root, listed.path) || ".",
    runsTests: typeof manifestOf(listed.path).scripts?.test === "string",
    testFileCount: countTestFilesUnder(listed.path),
  }));

const shortestPath = (packages: readonly ListedPackage[]): string =>
  packages.reduce(
    (shortest, one) => (one.path.length < shortest.length ? one.path : shortest),
    packages[0]?.path ?? process.cwd(),
  );

/** The `app` directory of every package that boots through expo-router. */
const routerRoots = (packages: readonly ListedPackage[]): readonly string[] =>
  packages
    .filter((one) => manifestOf(one.path).main === ROUTER_ENTRY)
    .map((one) => join(one.path, "app"))
    .filter(existsSync);

const filesUnder = (directory: string, prefix = ""): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesUnder(join(directory, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );

/** Each reporter prints its own finding and answers whether it found one. */
const reportUncollected = (root: string): boolean => {
  const uncollected = packagesWhoseTestsNeverRun(survey(root));

  if (uncollected.length === 0) {
    console.log("Every package carrying tests declares a test script.");
    return false;
  }

  console.error("These packages carry tests that `pnpm -r test` would never run:");
  for (const one of uncollected) {
    console.error(
      `  ${one.name} (${one.directory}) — ${one.testFileCount} test file(s), no "test" script`,
    );
  }
  console.error('\nAdd a "test" script to each, or move the tests into a package that has one.');
  return true;
};

const reportPublished = (root: string, routerRoot: string): boolean => {
  const where = relative(root, routerRoot);
  const published = testFilesTheRouterWouldPublish(filesUnder(routerRoot));

  if (published.length === 0) {
    console.log(`No test file sits in ${where}, where the router would publish it.`);
    return false;
  }

  console.error(`These test files sit under ${where}, which expo-router publishes as routes:`);
  for (const one of published) console.error(`  ${join(where, one)}`);
  console.error(
    "\nMove them out of the router root. A test file left there ships to users inside the bundle, and nothing runs it.",
  );
  return true;
};

const packages = listedPackages();
const root = shortestPath(packages);

const findings = [
  reportUncollected(root),
  ...routerRoots(packages).map((routerRoot) => reportPublished(root, routerRoot)),
];

process.exit(findings.some(Boolean) ? 1 : 0);
