/**
 * A workflow started by `pull_request_target` or `workflow_run` runs as the
 * default branch has it, with its token and secrets: that is what makes the
 * risk tier and the merge decision ones a pull request cannot rewrite
 * (ADR-0029, ADR-0030). The same rights make
 * the pull request's own code dangerous there, which GitHub warns against. This
 * finds such a workflow that checks out, fetches or names the pull request's
 * head, so that nothing of the pull request can run with them.
 */
import { parse } from "yaml";

import type { WorkflowFile } from "./ungated-workflows.ts";

export type UntrustedCheckout = { readonly workflow: string; readonly problem: string };

const TRIGGERS = ["pull_request_target", "workflow_run"] as const;
/** GitHub reads an action's owner and name whatever their case. */
const CHECKOUT = /^actions\/checkout@/i;
/** Either of these points the checkout somewhere else than the base. */
const ELSEWHERE = ["ref", "repository"] as const;

/** Git subcommands that bring in code, after any global options such as `-C dir`. */
const GIT_FETCHES =
  /\bgit(?:\s+-\S+(?:\s+[^\s-]\S*)?)*\s+(fetch|checkout|switch|pull|clone|worktree)\b/;
const OTHER_FETCHES = /\bgh\s+pr\s+checkout\b|refs\/pull\/|\/(?:tar|zip)ball\//;
/**
 * The expressions through which a workflow learns where the head is. Context
 * names are read whatever their case, and a bracket reaches any property.
 */
const HEAD =
  /github\.head_ref|github\.event\.pull_request\.(?:head\b[\w.]*|merge_commit_sha)|github\.event\.workflow_run\.(?:head_\w+|pull_requests)|github\.event\s*\[/i;

type Step = {
  readonly uses?: string;
  readonly run?: string;
  readonly with?: Record<string, unknown>;
  readonly env?: unknown;
};
type Job = {
  readonly uses?: string;
  readonly steps?: readonly Step[];
  readonly env?: unknown;
  readonly if?: unknown;
};

const startedByTrusted = (on: unknown): boolean =>
  TRIGGERS.some((trigger) => {
    if (on === trigger) return true;
    if (Array.isArray(on)) return on.includes(trigger);
    return typeof on === "object" && on !== null && trigger in on;
  });

const checkoutProblems = (step: Step): readonly string[] => {
  const options = step.with ?? {};
  const elsewhere = ELSEWHERE.filter((key) => options[key] !== undefined);
  if (elsewhere.length > 0) return [`checks out a ref of its own: ${elsewhere.join(", ")}`];
  return options["persist-credentials"] === false
    ? []
    : ["checks out without persist-credentials: false"];
};

const fetchProblem = (run: string): string | undefined => {
  const git = GIT_FETCHES.exec(run);
  if (git) return `git ${git[1]}`;
  return OTHER_FETCHES.exec(run)?.[0];
};

const stepProblems = (step: Step): readonly string[] => {
  if (step.uses && CHECKOUT.test(step.uses)) return checkoutProblems(step);
  const fetched = typeof step.run === "string" ? fetchProblem(step.run) : undefined;
  const given = OTHER_FETCHES.exec(JSON.stringify({ with: step.with, env: step.env }))?.[0];
  const head = HEAD.exec(JSON.stringify(step))?.[0];
  return [
    ...(fetched ? [`fetches code from a run: ${fetched}`] : []),
    ...(given ? [`fetches code in a step: ${given}`] : []),
    ...(head ? [`reaches the head: ${head}`] : []),
  ];
};

const jobProblems = (job: Job): readonly string[] => {
  // A called workflow is read by none of these rules, and may inherit every secret.
  if (job.uses) return [`calls a workflow: ${job.uses}`];
  const head = HEAD.exec(JSON.stringify({ env: job.env, if: job.if }))?.[0];
  return [
    ...(head ? [`reaches the head: ${head}`] : []),
    ...(job.steps ?? []).flatMap(stepProblems),
  ];
};

const findingsIn = (file: WorkflowFile): readonly UntrustedCheckout[] => {
  const definition = parse(file.text) as { on?: unknown; jobs?: Record<string, Job> } | null;
  if (!startedByTrusted(definition?.on)) return [];
  return Object.entries(definition?.jobs ?? {}).flatMap(([id, job]) =>
    jobProblems(job).map((problem) => ({ workflow: file.name, problem: `job "${id}" ${problem}` })),
  );
};

export const untrustedCheckouts = (files: readonly WorkflowFile[]): readonly UntrustedCheckout[] =>
  files.flatMap(findingsIn);
