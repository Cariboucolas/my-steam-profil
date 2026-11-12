import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ungatedWorkflows } from "./ungated-workflows";

/** This repository's workflows, unless a directory is named — which is how a fixture is checked. */
const DIRECTORY = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL("../../../.github/workflows", import.meta.url));

const files = readdirSync(DIRECTORY)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => ({ name, text: readFileSync(join(DIRECTORY, name), "utf8") }));

const ungated = ungatedWorkflows(files);
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

process.exit(ungated.length === 0 ? 0 : 1);
