import { LISTED_NOWHERE, type RiskTier } from "./risk-tiers.ts";

/** Enough to say why; the rest is counted rather than listed. */
const MOST_PATHS_LISTED = 30;

/**
 * A path is the change author's text. Escaped, a newline in a file name cannot
 * start a line of its own, where CI would read it as a workflow command.
 */
export const quoted = (text: string): string => JSON.stringify(text).slice(1, -1);

/**
 * The risk tier as Markdown: its first line, `### Risk tier N: …`, is what CI
 * shows as a notice; the paths that decide the tier follow (ADR-0028).
 */
export const tierReport = ({ tier, paths }: RiskTier, source: string): string => {
  const decisive = paths.filter((one) => one.tier === tier);
  const lines = [
    `### Risk tier ${tier}: decided by ${decisive.length} of ${paths.length} changed paths`,
    "",
    `Read against the risk tiers of AGENTS.md, from ${source}.`,
    "",
    ...decisive.slice(0, MOST_PATHS_LISTED).map((one) => {
      const rule = one.rule === LISTED_NOWHERE ? one.rule : `\`${one.rule}\``;
      return `- \`${quoted(one.path)}\` — ${rule}`;
    }),
  ];
  if (decisive.length > MOST_PATHS_LISTED) {
    lines.push(`- and ${decisive.length - MOST_PATHS_LISTED} more`);
  }
  return lines.join("\n");
};
