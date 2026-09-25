import { spawn } from "node:child_process";

import { buildsOf, type Build } from "./builds";

const PROFILE = "preview";
const PLATFORM = "android";

/**
 * Runs a command and answers what it printed on stdout. Its stderr goes
 * straight to the job's log: that is where `eas build` narrates twenty minutes
 * of queue and build, and where `--json` puts everything that is not JSON.
 */
const printed = (command: string, args: readonly string[], cwd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "inherit"] });
    const chunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks).toString("utf8"));
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}.`));
    });
  });

const json = (output: string, what: string): unknown => {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`${what} did not print JSON.`);
  }
};

/**
 * The same computation EAS runs when it stamps a build with its runtime, under
 * `runtimeVersion: { policy: "fingerprint" }` — checked against a real build
 * before this was written: at 4efb0a6 both say 71b5ede….
 */
export const fingerprintIn = (mobile: string) => async (): Promise<string> => {
  const output = await printed(
    "npx",
    ["expo-updates", "fingerprint:generate", "--platform", PLATFORM],
    mobile,
  );
  const fingerprint = json(output, "expo-updates fingerprint:generate");
  const hash =
    typeof fingerprint === "object" && fingerprint !== null && "hash" in fingerprint
      ? fingerprint.hash
      : undefined;
  if (typeof hash !== "string" || hash === "") {
    throw new Error("expo-updates fingerprint:generate printed no hash.");
  }
  return hash;
};

export const buildsListedIn =
  (mobile: string) =>
  async (runtime: string): Promise<readonly Build[]> =>
    buildsOf(
      json(
        await printed(
          "eas",
          [
            "build:list",
            "--platform", PLATFORM,
            "--build-profile", PROFILE,
            "--runtime-version", runtime,
            "--json",
            "--non-interactive",
          ],
          mobile,
        ),
        "eas build:list",
      ),
    );

/**
 * `--wait` because the link is only worth posting once there is an APK behind
 * it, and a build that fails at Expo must fail this run too.
 */
export const buildStartedIn = (mobile: string) => async (): Promise<readonly Build[]> =>
  buildsOf(
    json(
      await printed(
        "eas",
        [
          "build",
          "--profile", PROFILE,
          "--platform", PLATFORM,
          "--non-interactive",
          "--json",
          "--wait",
        ],
        mobile,
      ),
      "eas build",
    ),
  );
