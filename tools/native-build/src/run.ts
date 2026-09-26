import { coveringBuild, settle, type Build } from "./builds";

/**
 * Everything this reaches for, as parameters: a fingerprint, EAS, and the
 * channel. The decision between them is the whole job, and it is only testable
 * when what it decides about can be said rather than fetched.
 */
export type Ports = {
  /** The Android runtime of the checked-out commit, as expo-updates computes it. */
  readonly fingerprint: () => Promise<string>;
  /** The `preview` Android builds already made for that runtime, in any status. */
  readonly listBuilds: (runtime: string) => Promise<readonly Build[]>;
  /** Throws when there is no channel to announce a build to. */
  readonly checkChannel: () => Promise<void>;
  /** Starts the `preview` Android build and waits for it to settle. */
  readonly startBuild: () => Promise<readonly Build[]>;
  readonly announce: (line: string) => Promise<void>;
};

export type Outcome =
  | { readonly kind: "covered"; readonly build: Build }
  | { readonly kind: "built"; readonly installUrl: string };

/**
 * One line, for the builds channel. The short SHA is what matches it to a
 * revision; the reason is there because a build arriving unannounced reads as
 * noise, when what it means is that the phone has been stranded until now.
 */
export const builtLine = (sha: string, installUrl: string): string =>
  `📦 Android build for \`${sha.slice(0, 7)}\` is ready — the native fingerprint changed, so the installed app stops receiving updates until this one replaces it: ${installUrl}`;

/**
 * Makes sure the runtime this commit publishes updates for has a build a phone
 * can install. Most merges touch JavaScript only and end at the first question.
 * Throws when the build it started cannot be installed, or when the link to it
 * could not be posted: either way the run must go red.
 *
 * The channel is checked before the build, not after it: a build is one of the
 * month's fifteen on the free plan, and one nobody is told about is wasted.
 */
export const ensureBuild = async (ports: Ports, sha: string): Promise<Outcome> => {
  const runtime = await ports.fingerprint();

  const existing = coveringBuild(await ports.listBuilds(runtime));
  if (existing) return { kind: "covered", build: existing };

  await ports.checkChannel();
  const settled = settle(await ports.startBuild(), runtime);
  if (!settled.ok) throw new Error(settled.reason);

  await ports.announce(builtLine(sha, settled.installUrl));
  return { kind: "built", installUrl: settled.installUrl };
};
