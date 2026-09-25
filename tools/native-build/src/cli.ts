import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { announceTo } from "./discord";
import { buildStartedIn, buildsListedIn, fingerprintIn } from "./eas";
import { ensureBuild } from "./run";

const FAILED = 1;

const MOBILE = fileURLToPath(new URL("../../../apps/mobile", import.meta.url));

const fail = (message: string): never => {
  console.error(`::error::${message}`);
  process.exit(FAILED);
};

const required = (name: string, fix: string): string => {
  const value = process.env[name]?.trim();
  return value ? value : fail(`${name} is not set. ${fix}`);
};

/** The run's summary page, when there is one: what a green run did, in a line. */
const summarise = (line: string): void => {
  console.log(line);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `${line}\n`);
};

const sha = required("GITHUB_SHA", "It is set by Actions; this is not Actions.");

try {
  const outcome = await ensureBuild(
    {
      fingerprint: fingerprintIn(MOBILE),
      listBuilds: buildsListedIn(MOBILE),
      startBuild: buildStartedIn(MOBILE),
      // Read only when there is something to post. A merge whose fingerprint is
      // already built needs no channel, and must not go red for lack of one;
      // a build that finished does, and fails here, loudly, rather than skip.
      //
      // Logged first: once a build is finished the next run finds it and posts
      // nothing, so a post that failed would otherwise lose the link for good.
      announce: (line) => {
        console.log(line);
        return announceTo(
          required("DISCORD_BUILDS_WEBHOOK_URL", "Run: gh secret set DISCORD_BUILDS_WEBHOOK_URL"),
        )(line);
      },
    },
    sha,
  );

  summarise(
    outcome.kind === "covered"
      ? `No build needed: build ${outcome.build.id} (${outcome.build.status}) already serves this fingerprint.`
      : `Built, and posted to the builds channel: ${outcome.installUrl}`,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
