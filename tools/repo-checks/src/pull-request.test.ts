import { describe, expect, it } from "vitest";

import {
  mergeDecision,
  pullRequestReport,
  readComparedPullRequest,
  readPullRequest,
  workflowOutputs,
} from "./pull-request.ts";

const HEAD_SHA = "09f1f5826450b59290b806b1f36c11ac9aec8753";

/** What `GET /repos/{owner}/{repo}/pulls/{number}` answers, cut to what is read. */
const pull = (overrides: Record<string, unknown> = {}) => ({
  user: { login: "Cariboucolas" },
  changed_files: 2,
  base: { ref: "main", repo: { full_name: "Cariboucolas/my-steam-profil" } },
  head: { sha: HEAD_SHA, repo: { full_name: "Cariboucolas/my-steam-profil" } },
  draft: false,
  ...overrides,
});

/** `gh api --paginate --slurp` on the files of a pull request: one array per page. */
const PAGES = [[{ filename: "README.md" }, { filename: "docs/commands.md" }]];

describe("readPullRequest", () => {
  it("lists every changed path across pages", () => {
    const pages = [[{ filename: "README.md" }], [{ filename: "docs/commands.md" }]];

    expect(readPullRequest(pull(), pages)).toEqual({
      paths: ["README.md", "docs/commands.md"],
      listed: 2,
      changed: 2,
      fromFork: false,
      author: "Cariboucolas",
      draft: false,
      headSha: HEAD_SHA,
      baseRef: "main",
    });
  });

  /** A rename moves a file out of one rule and into another: both names count. */
  it("counts a renamed file under both its names", () => {
    const pages = [[{ filename: "docs/notes.md", previous_filename: ".github/notes.md" }]];

    expect(readPullRequest(pull({ changed_files: 1 }), pages).paths).toEqual([
      "docs/notes.md",
      ".github/notes.md",
    ]);
  });

  /** GitHub lists at most 3000 files: the count says when some went unseen. */
  it("says how many files GitHub listed against how many changed", () => {
    const facts = readPullRequest(pull({ changed_files: 3001 }), PAGES);

    expect([facts.listed, facts.changed]).toEqual([2, 3001]);
  });

  it("reads a head in another repository as a fork", () => {
    const fork = pull({ head: { sha: HEAD_SHA, repo: { full_name: "someone/my-steam-profil" } } });

    expect(readPullRequest(fork, PAGES).fromFork).toBe(true);
  });

  /** A fork deleted after its pull request opened leaves no head repository. */
  it("reads a head with no repository as a fork", () => {
    expect(readPullRequest(pull({ head: { sha: HEAD_SHA, repo: null } }), PAGES).fromFork).toBe(
      true,
    );
  });

  it("refuses an answer it cannot read rather than reading it as no change", () => {
    expect(() => readPullRequest(pull(), [[{ name: "README.md" }]])).toThrow(/filename/);
    expect(() => readPullRequest(pull(), { filename: "README.md" })).toThrow(/pages/);
    expect(() => readPullRequest(pull({ changed_files: "2" }), PAGES)).toThrow(/changed_files/);
    expect(() => readPullRequest(pull({ user: null }), PAGES)).toThrow(/user/);
    expect(() => readPullRequest(pull({ draft: "no" }), PAGES)).toThrow(/draft/);
  });

  /** The head commit goes into a workflow's outputs and pins the merge: nothing but a SHA. */
  it("refuses a head that is not a commit SHA", () => {
    const head = { sha: "main\nmerger=automation", repo: { full_name: "x/y" } };

    expect(() => readPullRequest(pull({ head }), PAGES)).toThrow(/head SHA/);
  });
});

describe("mergeDecision", () => {
  const facts = readPullRequest(pull(), PAGES);

  /** Tier 0 alone merges automatically; tier 1 waits on the AI reviewer's assessment (ADR-0030). */
  it("merges tier 0 alone automatically", () => {
    expect([0, 1, 2].map((tier) => mergeDecision(tier as 0 | 1 | 2, facts).merger)).toEqual([
      "automation",
      "owner",
      "owner",
    ]);
  });

  it("never merges automatically into another branch than main", () => {
    expect(mergeDecision(0, { ...facts, baseRef: "release\n::error::x" })).toEqual({
      merger: "owner",
      reason: "it targets `release\\n::error::x`, not main",
    });
  });

  it("never merges a draft automatically", () => {
    expect(mergeDecision(0, { ...facts, draft: true })).toEqual({
      merger: "owner",
      reason: "it is a draft",
    });
  });

  it("never merges a pull request from a fork automatically", () => {
    const fork = { ...facts, fromFork: true };

    expect(mergeDecision(0, fork, [0])).toEqual({
      merger: "owner",
      reason: "it comes from a fork, which is never merged automatically",
    });
  });

  /** Its CI runs without secrets, so the AI reviewer never reads it (ADR-0029). */
  it("never merges a pull request from Dependabot automatically", () => {
    const dependabot = { ...facts, author: "dependabot[bot]" };

    expect(mergeDecision(0, dependabot, [0])).toEqual({
      merger: "owner",
      reason: "it comes from Dependabot, which is never merged automatically",
    });
  });

  it("merges automatically only a tier listed as such, from this repository", () => {
    expect(mergeDecision(0, facts, [0])).toEqual({
      merger: "automation",
      reason: "tier 0 merges automatically once verify passes",
    });
    expect(mergeDecision(1, facts, [0])).toEqual({
      merger: "owner",
      reason: "tier 1 is merged by the owner",
    });
  });
});

describe("pullRequestReport", () => {
  it("reports the tier of the paths and who merges", () => {
    const report = pullRequestReport(readPullRequest(pull(), PAGES), 206);

    expect(report.tier).toBe(0);
    expect(report.merger).toBe("automation");
    expect(report.markdown.split("\n")).toEqual([
      "### Risk tier 0: decided by 2 of 2 changed paths",
      "",
      "Read against the risk tiers of AGENTS.md, from the files GitHub lists for pull request #206.",
      "",
      "- `README.md` — `README.md`",
      "- `docs/commands.md` — `docs/**`",
      "",
      "Merged automatically: tier 0 merges automatically once verify passes.",
    ]);
  });

  /** A file GitHub did not list could be any tier: the highest is assumed. */
  it("reads a pull request whose files GitHub did not all list as tier 2", () => {
    const report = pullRequestReport(readPullRequest(pull({ changed_files: 3001 }), PAGES), 7);

    expect(report.tier).toBe(2);
    expect(report.markdown.split("\n")[0]).toBe(
      "### Risk tier 2: GitHub listed 2 of the 3001 files changed",
    );
  });
});

describe("workflowOutputs", () => {
  it("gives the tier, who merges and the head the decision was made on", () => {
    const facts = readPullRequest(pull(), PAGES);

    expect(workflowOutputs(pullRequestReport(facts, 206), facts)).toBe(
      `tier=0\nmerger=automation\nhead=${HEAD_SHA}\n`,
    );
  });
});

/**
 * `GET /repos/{owner}/{repo}/compare/{base}...{verified}`: the files of one
 * commit, which no later push can change (ADR-0030).
 */
describe("readComparedPullRequest", () => {
  const comparison = (files: readonly unknown[]) => ({ files });

  it("reads the paths of the compared commit, not the pull request's list", () => {
    const facts = readComparedPullRequest(
      pull({ changed_files: 1 }),
      comparison([{ filename: "AGENTS.md" }, { filename: "docs/a.md", previous_filename: "b.md" }]),
    );

    expect(facts.paths).toEqual(["AGENTS.md", "docs/a.md", "b.md"]);
    expect([facts.listed, facts.changed]).toEqual([2, 2]);
  });

  /** GitHub lists 300 files of a comparison at most: at 300, some may be missing. */
  it("reads a comparison of 300 files as cut short", () => {
    const files = Array.from({ length: 300 }, (_, i) => ({ filename: `docs/${i}.md` }));
    const facts = readComparedPullRequest(pull(), comparison(files));

    expect(pullRequestReport(facts, 7).tier).toBe(2);
  });

  it("refuses a comparison it cannot read", () => {
    expect(() => readComparedPullRequest(pull(), {})).toThrow(/comparison/);
    expect(() => readComparedPullRequest(pull(), comparison([{ name: "x" }]))).toThrow(/filename/);
  });
});
