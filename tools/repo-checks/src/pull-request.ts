import { riskTier, type Tier } from "./risk-tiers.ts";
import { tierReport } from "./tier-report.ts";

/**
 * What the risk tier and the merge decision of a pull request are read from:
 * GitHub's answers about it, never its code (ADR-0029). Both answers come from
 * a workflow started by `pull_request_target`, which runs as `main` has it.
 */
export type PullRequestFacts = {
  /** Every path the files list names, a renamed file under both its names. */
  readonly paths: readonly string[];
  /** How many files GitHub listed, and how many it says changed: it lists 3000 at most. */
  readonly listed: number;
  readonly changed: number;
  readonly fromFork: boolean;
  readonly author: string;
};

export type MergeDecision = { readonly merger: "owner" | "automation"; readonly reason: string };

const DEPENDABOT = "dependabot[bot]";

/** No tier merges automatically yet: the owner merges every pull request. */
const NO_TIER: readonly Tier[] = [];

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const unreadable = (what: string): never => {
  throw new Error(`Cannot read the pull request from GitHub's answer: ${what}`);
};

const stringAt = (fields: unknown, key: string, what: string): string => {
  const value = isFields(fields) ? fields[key] : undefined;
  return typeof value === "string" ? value : unreadable(`${what} is not a string`);
};

const pathsOf = (file: unknown): readonly string[] => {
  const filename = stringAt(file, "filename", "a file's filename");
  const previous = isFields(file) ? file.previous_filename : undefined;
  if (previous === undefined) return [filename];
  return [filename, stringAt(file, "previous_filename", "a file's previous_filename")];
};

/**
 * `pull` is `GET /repos/{owner}/{repo}/pulls/{number}`; `pages` is its files,
 * as `gh api --paginate --slurp` gives them, one array per page. Anything
 * else throws: an answer misread as no change would read as tier 0.
 */
export const readPullRequest = (pull: unknown, pages: unknown): PullRequestFacts => {
  if (!Array.isArray(pages) || !pages.every(Array.isArray)) {
    return unreadable("the files are not a list of pages");
  }
  const files: readonly unknown[] = pages.flat();
  if (!isFields(pull)) return unreadable("the pull request is not an object");

  const changed = pull.changed_files;
  if (typeof changed !== "number") return unreadable("changed_files is not a number");

  const base = stringAt(isFields(pull.base) ? pull.base.repo : undefined, "full_name", "the base");
  const headRepo = isFields(pull.head) ? pull.head.repo : undefined;
  // A fork deleted after its pull request opened leaves a head with no repository.
  const head = headRepo === null ? null : stringAt(headRepo, "full_name", "the head");

  return {
    paths: files.flatMap(pathsOf),
    listed: files.length,
    changed,
    fromFork: head !== base,
    author: stringAt(pull.user, "login", "the user's login"),
  };
};

/**
 * Who merges: the owner, unless the tier is one that merges automatically and
 * the pull request comes from this repository. A fork's or Dependabot's never
 * merges automatically, whatever its tier.
 */
export const mergeDecision = (
  tier: Tier,
  facts: PullRequestFacts,
  automaticTiers: readonly Tier[] = NO_TIER,
): MergeDecision => {
  if (facts.fromFork) {
    return { merger: "owner", reason: "it comes from a fork, which is never merged automatically" };
  }
  if (facts.author === DEPENDABOT) {
    return {
      merger: "owner",
      reason: "it comes from Dependabot, which is never merged automatically",
    };
  }
  return automaticTiers.includes(tier)
    ? { merger: "automation", reason: `tier ${tier} merges automatically once verify passes` }
    : { merger: "owner", reason: `tier ${tier} is merged by the owner` };
};

export type PullRequestReport = MergeDecision & { readonly tier: Tier; readonly markdown: string };

const MERGERS = { owner: "Merged by the owner", automation: "Merged automatically" } as const;

/**
 * The tier of the paths GitHub lists, and who merges. A file GitHub did not
 * list could hold any tier, so a list that falls short is tier 2.
 */
export const pullRequestReport = (
  facts: PullRequestFacts,
  number: number,
  automaticTiers: readonly Tier[] = NO_TIER,
): PullRequestReport => {
  const complete = facts.listed >= facts.changed;
  const computed = riskTier(facts.paths);
  const tier: Tier = complete ? computed.tier : 2;
  const decision = mergeDecision(tier, facts, automaticTiers);
  const tierLines = complete
    ? tierReport(computed, `the files GitHub lists for pull request #${number}`)
    : `### Risk tier 2: GitHub listed ${facts.listed} of the ${facts.changed} files changed`;

  return {
    ...decision,
    tier,
    markdown: `${tierLines}\n\n${MERGERS[decision.merger]}: ${decision.reason}.`,
  };
};
