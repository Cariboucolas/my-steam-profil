import { describe, expect, it } from "vitest";

import { mergeDecision, pullRequestReport, readPullRequest } from "./pull-request.ts";

/** What `GET /repos/{owner}/{repo}/pulls/{number}` answers, cut to what is read. */
const pull = (overrides: Record<string, unknown> = {}) => ({
  user: { login: "Cariboucolas" },
  changed_files: 2,
  base: { repo: { full_name: "Cariboucolas/my-steam-profil" } },
  head: { repo: { full_name: "Cariboucolas/my-steam-profil" } },
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
    const fork = pull({ head: { repo: { full_name: "someone/my-steam-profil" } } });

    expect(readPullRequest(fork, PAGES).fromFork).toBe(true);
  });

  /** A fork deleted after its pull request opened leaves no head repository. */
  it("reads a head with no repository as a fork", () => {
    expect(readPullRequest(pull({ head: { repo: null } }), PAGES).fromFork).toBe(true);
  });

  it("refuses an answer it cannot read rather than reading it as no change", () => {
    expect(() => readPullRequest(pull(), [[{ name: "README.md" }]])).toThrow(/filename/);
    expect(() => readPullRequest(pull(), { filename: "README.md" })).toThrow(/pages/);
    expect(() => readPullRequest(pull({ changed_files: "2" }), PAGES)).toThrow(/changed_files/);
    expect(() => readPullRequest(pull({ user: null }), PAGES)).toThrow(/user/);
  });
});

describe("mergeDecision", () => {
  const facts = readPullRequest(pull(), PAGES);

  it("leaves every tier to the owner while no tier merges automatically", () => {
    for (const tier of [0, 1, 2] as const) {
      expect(mergeDecision(tier, facts).merger).toBe("owner");
    }
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
    expect(report.merger).toBe("owner");
    expect(report.markdown.split("\n")).toEqual([
      "### Risk tier 0: decided by 2 of 2 changed paths",
      "",
      "Read against the risk tiers of AGENTS.md, from the files GitHub lists for pull request #206.",
      "",
      "- `README.md` — `README.md`",
      "- `docs/commands.md` — `docs/**`",
      "",
      "Merged by the owner: tier 0 is merged by the owner.",
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
