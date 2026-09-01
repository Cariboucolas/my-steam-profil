import { describe, expect, it } from "vitest";

import { packagesWhoseTestsNeverRun, type SurveyedPackage } from "./uncollected-tests";

const surveyed = (over: Partial<SurveyedPackage> = {}): SurveyedPackage => ({
  name: "@steam/domain",
  directory: "packages/domain",
  runsTests: true,
  testFileCount: 7,
  ...over,
});

describe("packagesWhoseTestsNeverRun", () => {
  it("keeps quiet when every package carrying tests runs them", () => {
    expect(packagesWhoseTestsNeverRun([surveyed(), surveyed({ name: "@steam/api" })])).toEqual([]);
  });

  /**
   * The failure this exists for: pnpm -r test skips a package with no test
   * script without a word, so its tests never run and CI still reports green.
   */
  it("names a package whose tests nothing would run", () => {
    const forgotten = surveyed({
      name: "@steam/newcomer",
      directory: "packages/newcomer",
      runsTests: false,
      testFileCount: 3,
    });

    expect(packagesWhoseTestsNeverRun([surveyed(), forgotten])).toEqual([forgotten]);
  });

  it("leaves alone a package that carries no tests at all", () => {
    const typesOnly = surveyed({
      name: "@steam/contracts",
      directory: "packages/contracts",
      runsTests: false,
      testFileCount: 0,
    });

    expect(packagesWhoseTestsNeverRun([typesOnly])).toEqual([]);
  });
});
