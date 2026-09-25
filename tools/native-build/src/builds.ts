/**
 * Every status EAS can report, as `eas build:list --status` spells them in
 * upper case. Anything else is refused: a status this does not know is a
 * status it cannot say covers a runtime or not.
 */
const STATUSES = [
  "NEW",
  "IN_QUEUE",
  "IN_PROGRESS",
  "FINISHED",
  "PENDING_CANCEL",
  "CANCELED",
  "ERRORED",
] as const;

export type Status = (typeof STATUSES)[number];

/** What this reads of a build, out of the forty-odd fields EAS prints. */
export type Build = {
  readonly id: string;
  readonly status: Status;
  readonly runtimeVersion: string | undefined;
  /** The APK. Absent until the build has finished. */
  readonly installUrl: string | undefined;
};

export type Settled =
  | { readonly ok: true; readonly installUrl: string }
  | { readonly ok: false; readonly reason: string };

/**
 * Builds that exist, or will. A queued build is as good as a finished one here:
 * two merges a minute apart with the same new fingerprint must cost one build,
 * and the second sees the first only while it is still queued.
 */
const COVERING: ReadonlySet<Status> = new Set(["NEW", "IN_QUEUE", "IN_PROGRESS", "FINISHED"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;

const statusOf = (value: unknown): Status => {
  const status = STATUSES.find((known) => known === value);
  if (!status) throw new Error(`EAS reported a build status this does not know: ${String(value)}`);
  return status;
};

const buildOf = (entry: unknown): Build => {
  if (!isRecord(entry)) throw new Error("EAS printed a build that is not an object.");

  const id = text(entry.id);
  if (!id) throw new Error("EAS printed a build with no id.");

  return {
    id,
    status: statusOf(entry.status),
    runtimeVersion: isRecord(entry.runtime) ? text(entry.runtime.version) : undefined,
    installUrl: isRecord(entry.artifacts) ? text(entry.artifacts.buildUrl) : undefined,
  };
};

/**
 * The `--json` output of `eas build:list` and of `eas build`, which print the
 * same shape. Read strictly: what comes back is what decides whether twenty
 * minutes of build time get spent, so a shape that is not understood stops the
 * run instead of being read as "no build".
 */
export const buildsOf = (printed: unknown): readonly Build[] => {
  if (!Array.isArray(printed)) throw new Error("EAS printed something that is not a list of builds.");
  return printed.map(buildOf);
};

/** The build that already serves this runtime, if one exists or is on its way. */
export const coveringBuild = (builds: readonly Build[]): Build | undefined =>
  builds.find((one) => COVERING.has(one.status));

/**
 * Whether the build this run started and waited for is one a phone can
 * install. `eas build --wait` should already have failed on an errored build;
 * this does not rely on it.
 */
export const settle = (builds: readonly Build[], runtime: string): Settled => {
  if (builds.length !== 1) {
    return { ok: false, reason: `eas build answered ${builds.length} builds, not one.` };
  }

  const [only] = builds as readonly [Build];

  if (only.status !== "FINISHED") {
    return { ok: false, reason: `The build ended ${only.status} at Expo.` };
  }

  if (only.runtimeVersion !== runtime) {
    return {
      ok: false,
      reason: `The build carries runtime ${only.runtimeVersion ?? "none"}, but this run computed ${runtime}. Detection would start a build on every merge.`,
    };
  }

  if (!only.installUrl) {
    return { ok: false, reason: `Build ${only.id} finished with no install link.` };
  }

  return { ok: true, installUrl: only.installUrl };
};
