import { appendFileSync, readFileSync } from "node:fs";

import {
  pullRequestReport,
  readComparedPullRequest,
  readPullRequest,
  workflowOutputs,
} from "./pull-request.ts";

/**
 * Prints, as Markdown, the risk tier of a pull request and who merges it, from
 * two answers of GitHub's API saved as files: the pull request and its files
 * (ADR-0029). `risk-tier.yml` and `merge-tier-0.yml` run it with plain `node`,
 * from `main`, where nothing of the pull request is checked out. Under Actions
 * it also writes the tier, who merges and the head SHA as step outputs.
 *
 * Usage: node pull-request-tier-cli.ts <number> <pull.json> <files.json> [--comparison]
 *
 * With `--comparison`, the files are a comparison of the base with one commit
 * rather than the pull request's own list, which follows its head: what
 * `merge-tier-0.yml` merges is the commit it classified (ADR-0030).
 */
const [number, pullFile, filesFile, mode] = process.argv.slice(2);

if (!number || !pullFile || !filesFile) {
  console.error("Usage: node pull-request-tier-cli.ts <number> <pull.json> <files.json>");
  process.exit(2);
}

const json = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

const read = mode === "--comparison" ? readComparedPullRequest : readPullRequest;
const facts = read(json(pullFile), json(filesFile));
const report = pullRequestReport(facts, Number(number));

console.log(report.markdown);
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, workflowOutputs(report, facts));
