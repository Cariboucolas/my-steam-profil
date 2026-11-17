import { readFileSync } from "node:fs";

import { pullRequestReport, readPullRequest } from "./pull-request.ts";

/**
 * Prints, as Markdown, the risk tier of a pull request and who merges it, from
 * two answers of GitHub's API saved as files: the pull request and its files
 * (ADR-0029). The risk-tier workflow runs it with plain `node`, from `main`,
 * where nothing of the pull request is checked out.
 *
 * Usage: node pull-request-tier-cli.ts <number> <pull.json> <files.json>
 */
const [number, pullFile, filesFile] = process.argv.slice(2);

if (!number || !pullFile || !filesFile) {
  console.error("Usage: node pull-request-tier-cli.ts <number> <pull.json> <files.json>");
  process.exit(2);
}

const json = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

console.log(
  pullRequestReport(readPullRequest(json(pullFile), json(filesFile)), Number(number)).markdown,
);
