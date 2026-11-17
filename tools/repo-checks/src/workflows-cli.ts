import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ungatedWorkflows } from "./ungated-workflows";
import { untrustedCheckouts } from "./untrusted-checkouts";

/** This repository's workflows, unless a directory is named — which is how a fixture is checked. */
const DIRECTORY = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL("../../../.github/workflows", import.meta.url));

const files = readdirSync(DIRECTORY)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => ({ name, text: readFileSync(join(DIRECTORY, name), "utf8") }));

const ungated = ungatedWorkflows(files);
const untrusted = untrustedCheckouts(files);
const where = relative(process.cwd(), DIRECTORY) || ".";

if (ungated.length === 0) {
  console.log(`Every workflow in ${where} that runs on a push to main waits on CI first.`);
} else {
  console.error(`These workflows in ${where} can publish a commit whose CI has not passed:`);
  for (const one of ungated) console.error(`  ${one.workflow} — ${one.problem}`);
  console.error(
    "\nCall ./.github/workflows/ci.yml from a job, and make every other job need it (ADR-0027).",
  );
}

if (untrusted.length === 0) {
  console.log(
    `No workflow in ${where} started by pull_request_target or workflow_run reaches a pull request's code.`,
  );
} else {
  console.error(`These workflows in ${where} could run a pull request's code with main's rights:`);
  for (const one of untrusted) console.error(`  ${one.workflow} — ${one.problem}`);
  console.error(
    "\nCheck out the base only, with persist-credentials: false, and read the pull request through the API (ADR-0029, ADR-0030).",
  );
}

process.exit(ungated.length + untrusted.length === 0 ? 0 : 1);
