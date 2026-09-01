/**
 * `pnpm -r test` runs the `test` script of every package that has one and skips
 * the rest without a word. A package created with tests but no `test` script is
 * therefore invisible: its tests never run, and CI stays green having executed
 * nothing. This finds those packages before the silence becomes a habit.
 */
export type SurveyedPackage = {
  readonly name: string;
  readonly directory: string;
  /** Whether its package.json declares a `test` script. */
  readonly runsTests: boolean;
  readonly testFileCount: number;
};

export const packagesWhoseTestsNeverRun = (
  surveyed: readonly SurveyedPackage[],
): readonly SurveyedPackage[] =>
  surveyed.filter((one) => one.testFileCount > 0 && !one.runsTests);
