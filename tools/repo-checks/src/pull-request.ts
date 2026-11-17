import { riskTier, type Tier } from "./risk-tiers.ts";
import { quoted, tierReport } from "./tier-report.ts";

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
  readonly draft: boolean;
  /** The commit the facts describe: a merge decided on it is pinned to it. */
  readonly headSha: string;
  /** The branch it would merge into. */
  readonly baseRef: string;
};

export type MergeDecision = { readonly merger: "owner" | "automation"; readonly reason: string };

const DEPENDABOT = "dependabot[bot]";
const MAIN = "main";

/** Tier 0 alone; tier 1 waits on the AI reviewer's assessment (ADR-0030). */
const AUTOMATIC_TIERS: readonly Tier[] = [0];

const COMMIT_SHA = /^[0-9a-f]{40}$/;

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
  const changed = isFields(pull) ? pull.changed_files : undefined;
  if (typeof changed !== "number") return unreadable("changed_files is not a number");
  return readWithFiles(pull, pages.flat(), changed);
};

/** GitHub lists this many files of a comparison at most, on its first page only. */
const COMPARISON_MOST_FILES = 300;

/**
 * `comparison` is `GET /repos/{owner}/{repo}/compare/{base}...{head}` with both
 * ends as SHAs: the files of that commit, which no later push can change,
 * where the pull request's own list follows its head. A comparison listing as
 * many files as GitHub lists at most may have lost some: it counts one more.
 */
export const readComparedPullRequest = (pull: unknown, comparison: unknown): PullRequestFacts => {
  const files = isFields(comparison) ? comparison.files : undefined;
  if (!Array.isArray(files)) return unreadable("the comparison lists no files");
  const changed = files.length >= COMPARISON_MOST_FILES ? files.length + 1 : files.length;
  return readWithFiles(pull, files, changed);
};

const readWithFiles = (
  pull: unknown,
  files: readonly unknown[],
  changed: number,
): PullRequestFacts => {
  if (!isFields(pull)) return unreadable("the pull request is not an object");

  const base = stringAt(isFields(pull.base) ? pull.base.repo : undefined, "full_name", "the base");
  const headSha = stringAt(pull.head, "sha", "the head SHA");
  if (!COMMIT_SHA.test(headSha)) return unreadable("the head SHA is not a commit SHA");
  if (typeof pull.draft !== "boolean") return unreadable("draft is not a boolean");
  const headRepo = isFields(pull.head) ? pull.head.repo : undefined;
  // A fork deleted after its pull request opened leaves a head with no repository.
  const head = headRepo === null ? null : stringAt(headRepo, "full_name", "the head");

  return {
    paths: files.flatMap(pathsOf),
    listed: files.length,
    changed,
    fromFork: head !== base,
    author: stringAt(pull.user, "login", "the user's login"),
    draft: pull.draft,
    headSha,
    baseRef: stringAt(pull.base, "ref", "the base ref"),
  };
};

/**
 * Who merges: the owner, unless the tier is one that merges automatically and
 * the pull request comes from this repository, targets main and is not a draft. A fork's or
 * Dependabot's never merges automatically, whatever its tier.
 */
export const mergeDecision = (
  tier: Tier,
  facts: PullRequestFacts,
  automaticTiers: readonly Tier[] = AUTOMATIC_TIERS,
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
  if (facts.baseRef !== MAIN) {
    return { merger: "owner", reason: `it targets \`${quoted(facts.baseRef)}\`, not ${MAIN}` };
  }
  if (facts.draft) return { merger: "owner", reason: "it is a draft" };
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
  automaticTiers: readonly Tier[] = AUTOMATIC_TIERS,
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

/**
 * The lines a workflow appends to `$GITHUB_OUTPUT`: every value is a digit, a
 * word of this file or a checked SHA, never the pull request's text.
 */
export const workflowOutputs = (report: PullRequestReport, facts: PullRequestFacts): string =>
  `tier=${report.tier}\nmerger=${report.merger}\nhead=${facts.headSha}\n`;
