import { changedPaths } from "./changed-paths.ts";
import { riskTier } from "./risk-tiers.ts";
import { quoted, tierReport } from "./tier-report.ts";

/**
 * Prints, as Markdown, the risk tier of what HEAD changed since `base` and the
 * paths that decide it (ADR-0028), for a branch before it becomes a pull
 * request. It informs: the exit code says only whether the tier could be
 * computed, never which tier it is. CI computes the tier of a pull request
 * otherwise, from the files GitHub lists (`pull-request-tier-cli.ts`).
 *
 * Plain `node` runs it, with no dependency installed and imports spelled with
 * their `.ts`.
 */
const base = process.argv[2];

if (!base) {
  console.error("Usage: pnpm check:tier <base>   e.g. pnpm check:tier origin/main");
  process.exit(2);
}

console.log(tierReport(riskTier(changedPaths(base, process.cwd())), `\`${quoted(base)}...HEAD\``));
