import { changedPaths } from "./changed-paths";
import { LISTED_NOWHERE, riskTier } from "./risk-tiers";

/**
 * Prints, as Markdown, the risk tier of what HEAD changed since `base` and the
 * paths that decide it (ADR-0028). It informs: the exit code says only whether
 * the tier could be computed, never which tier it is.
 */
const base = process.argv[2];

if (!base) {
  console.error("Usage: pnpm check:tier <base>   e.g. pnpm check:tier origin/main");
  process.exit(2);
}

/** Enough to say why; the rest is counted rather than listed. */
const MOST_PATHS_LISTED = 30;

/**
 * A path is the change author's text. Escaped, a newline in a file name cannot
 * start a line of its own, where CI would read it as a workflow command.
 */
const quoted = (path: string): string => JSON.stringify(path).slice(1, -1);

const paths = changedPaths(base, process.cwd());
const { tier, paths: classified } = riskTier(paths);
const decisive = classified.filter((one) => one.tier === tier);

console.log(
  `### Risk tier ${tier}: decided by ${decisive.length} of ${paths.length} changed paths`,
);
console.log("");
console.log(`Read against the risk tiers of AGENTS.md, from \`${quoted(base)}...HEAD\`.`);
console.log("");
for (const one of decisive.slice(0, MOST_PATHS_LISTED)) {
  const rule = one.rule === LISTED_NOWHERE ? one.rule : `\`${one.rule}\``;
  console.log(`- \`${quoted(one.path)}\` — ${rule}`);
}
if (decisive.length > MOST_PATHS_LISTED) {
  console.log(`- and ${decisive.length - MOST_PATHS_LISTED} more`);
}
