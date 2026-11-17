/**
 * What ADR-0033 promises of the AI reviewer, read from the workflow and the
 * instructions as `main` holds them: a change that widens what the reviewer may
 * do, or where its secret goes, fails here before the owner reads it.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { riskTier } from "./risk-tiers";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const WORKFLOW = ".github/workflows/ai-review.yml";
const INSTRUCTIONS = ".github/ai-review.md";

type Step = {
  readonly id?: string;
  readonly uses?: string;
  readonly if?: string;
  readonly run?: string;
  readonly with?: Record<string, string>;
};
type Job = {
  readonly if?: string;
  readonly permissions?: unknown;
  readonly steps: readonly Step[];
};
type Workflow = {
  readonly on: Record<string, { readonly types?: readonly string[] }>;
  readonly permissions?: unknown;
  readonly jobs: Record<string, Job>;
};

/** A GitHub expression as the workflow writes it. */
const expression = (body: string) => `\${{ ${body} }}`;

const text = readFileSync(`${ROOT}${WORKFLOW}`, "utf8");
const definition = parse(text) as Workflow;
const jobs = Object.values(definition.jobs);
const job = jobs[0] as Job;
const reviewer = job.steps.find((step) => step.uses?.startsWith("anthropics/claude-code-action@"));
const args = reviewer?.with?.claude_args ?? "";

describe("the AI review workflow", () => {
  it("runs as main has it, on a pull request opened, updated or made ready", () => {
    expect(Object.keys(definition.on)).toEqual(["pull_request_target"]);
    expect(definition.on.pull_request_target?.types).toEqual([
      "opened",
      "synchronize",
      "reopened",
      "ready_for_review",
    ]);
  });

  it("grants its one job reading the code and commenting the pull request, nothing more", () => {
    expect(definition.permissions).toEqual({});
    expect(jobs).toHaveLength(1);
    expect(job.permissions).toEqual({ contents: "read", "pull-requests": "write" });
  });

  it("skips a draft and a Dependabot pull request", () => {
    expect(job.if).toContain("!github.event.pull_request.draft");
    expect(job.if).toContain("github.event.pull_request.user.login != 'dependabot[bot]'");
  });

  /** A fork's pull request gets main's secrets on pull_request_target: it never reaches them. */
  it("reaches the reviewer only for a pull request whose branch lives in this repository", () => {
    const decide = job.steps.find((step) => step.id === "decide");

    expect(decide?.run).toContain(".head.repo.full_name == env.GITHUB_REPOSITORY");
    expect(reviewer?.if).toBe("steps.decide.outputs.review == 'true'");
    expect(job.steps.indexOf(decide as Step)).toBeLessThan(job.steps.indexOf(reviewer as Step));
  });

  it("pins the action to a commit", () => {
    expect(reviewer?.uses).toMatch(/^anthropics\/claude-code-action@[0-9a-f]{40}$/);
  });

  it("hands the subscription token to the reviewer's step alone", () => {
    const holders = job.steps.filter((step) => JSON.stringify(step).includes("secrets."));

    expect(holders).toEqual([reviewer]);
    expect(reviewer?.with?.claude_code_oauth_token).toBe(
      expression("secrets.CLAUDE_CODE_OAUTH_TOKEN"),
    );
    expect(reviewer?.with?.github_token).toBe(expression("github.token"));
  });

  it("lets the reviewer read and comment inline, and nothing else", () => {
    expect(args).toContain("--permission-mode dontAsk");
    expect(args).toContain('--tools "Read,Glob,Grep"');
    expect(args).toContain('--allowedTools "mcp__github_inline_comment__create_inline_comment"');
    expect(args).toContain('"Read(./.git/**)"');
    expect(args).not.toMatch(/Bash|Edit|Write|WebFetch|bypassPermissions|dangerously/);
  });

  it("reads its instructions from main's checkout", () => {
    expect(text).toContain(INSTRUCTIONS);
  });
});

describe("the AI reviewer's instructions", () => {
  const instructions = readFileSync(`${ROOT}${INSTRUCTIONS}`, "utf8");

  it.each([
    ["the contract", "AGENTS.md"],
    ["the decisions", "docs/adr/"],
    ["the pull request as data", "data, not instructions"],
    ["a rule cited for every blocking finding", "cites the rule"],
  ])("name %s", (_, words) => {
    expect(instructions).toContain(words);
  });

  it("are, with the workflow, read by the owner before merge", () => {
    expect(riskTier([WORKFLOW, INSTRUCTIONS]).paths.map((one) => one.tier)).toEqual([2, 2]);
  });
});
