/**
 * Nothing leaves `main` unless CI has passed on that very commit (ADR-0027).
 * A workflow started by a push to `main` runs beside ci.yml, not behind it,
 * unless it calls ci.yml itself and every other job waits on that call: on
 * 2026-10-06 a red main deployed exactly that way. This finds the workflows
 * that would let it happen again.
 */
import { parse } from "yaml";

export type WorkflowFile = { readonly name: string; readonly text: string };
export type UngatedWorkflow = { readonly workflow: string; readonly problem: string };

/** The gate itself: calling it is how a workflow waits on CI. */
const CI_FILE = "ci.yml";
const CI_CALL = `./.github/workflows/${CI_FILE}`;
const MAIN = "main";

/** Any of these in a job's `if` replaces the implicit success(): it runs after a red CI. */
const RUNS_WHATEVER_CI_SAID = /\b(always|failure|cancelled)\s*\(/;

type Job = {
  readonly uses?: string;
  readonly needs?: string | readonly string[];
  readonly if?: unknown;
};
type PushFilter = Record<string, readonly string[] | undefined> | null | undefined;

/** GitHub's branch globs, enough for `*` and `**`; a negated pattern never matches here. */
const matchesMain = (pattern: string): boolean =>
  new RegExp(
    `^${pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, ".*")
      .replace(/(?<!\.)\*/g, "[^/]*")}$`,
  ).test(MAIN);

const pushReachesMain = (filter: PushFilter): boolean => {
  if (!filter) return true;
  if (filter.branches) return filter.branches.some(matchesMain);
  if (filter["branches-ignore"]) return !filter["branches-ignore"].some(matchesMain);
  // A push filtered on tags alone runs for tags, never for a branch.
  return !(filter.tags || filter["tags-ignore"]);
};

const runsOnPushToMain = (on: unknown): boolean => {
  if (on === "push") return true;
  if (Array.isArray(on)) return on.includes("push");
  if (on && typeof on === "object" && "push" in on) {
    return pushReachesMain((on as { push: PushFilter }).push);
  }
  return false;
};

const needsOf = (job: Job): readonly string[] =>
  job.needs === undefined ? [] : typeof job.needs === "string" ? [job.needs] : job.needs;

const findingsIn = (file: WorkflowFile): readonly UngatedWorkflow[] => {
  const definition = parse(file.text) as { on?: unknown; jobs?: Record<string, Job> } | null;
  if (file.name === CI_FILE || !runsOnPushToMain(definition?.on)) return [];

  const jobs = Object.entries(definition?.jobs ?? {});
  const gates = new Set(jobs.filter(([, job]) => job.uses === CI_CALL).map(([id]) => id));
  const found = (problem: string) => ({ workflow: file.name, problem });

  if (gates.size === 0) return [found(`no job calls ${CI_CALL}`)];

  const byId = new Map(jobs);
  const waitsOnCi = (id: string, seen: ReadonlySet<string> = new Set()): boolean =>
    needsOf(byId.get(id) ?? {}).some(
      (need) => gates.has(need) || (!seen.has(need) && waitsOnCi(need, new Set([...seen, id]))),
    );

  return jobs
    .filter(([id]) => !gates.has(id))
    .flatMap(([id, job]) => {
      if (!waitsOnCi(id)) return [found(`job "${id}" does not wait on CI`)];
      const condition = typeof job.if === "string" ? job.if : "";
      return RUNS_WHATEVER_CI_SAID.test(condition)
        ? [found(`job "${id}" runs even when CI fails: if: ${condition}`)]
        : [];
    });
};

export const ungatedWorkflows = (files: readonly WorkflowFile[]): readonly UngatedWorkflow[] =>
  files.flatMap(findingsIn);
