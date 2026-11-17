/**
 * A workflow started by `pull_request_target` or `workflow_run` runs with
 * main's token and secrets (ADR-0029, ADR-0030). A third-party action named by
 * a tag or a branch runs whatever its owner points that name at next, with
 * those rights. This finds such an action not pinned to a full commit SHA
 * (ADR-0033). GitHub's own `actions/*` and the repository's local actions keep
 * their tags, as in every other workflow.
 */
import { parse } from "yaml";

import type { WorkflowFile } from "./ungated-workflows.ts";

export type UnpinnedAction = { readonly workflow: string; readonly problem: string };

const TRIGGERS = ["pull_request_target", "workflow_run"] as const;
/** GitHub reads an action's owner whatever its case. */
const TRUSTED = /^(?:actions\/|\.\/|docker:\/\/)/i;
const PINNED = /@[0-9a-f]{40}$/;

/** A job's `uses` calls a reusable workflow, which runs with the caller's rights. */
type Job = { readonly uses?: string; readonly steps?: readonly { readonly uses?: string }[] };

const startedByTrusted = (on: unknown): boolean =>
  TRIGGERS.some((trigger) => {
    if (on === trigger) return true;
    if (Array.isArray(on)) return on.includes(trigger);
    return typeof on === "object" && on !== null && trigger in on;
  });

const unpinnedIn = (job: Job): readonly string[] =>
  [job.uses, ...(job.steps ?? []).map((step) => step.uses)]
    .filter((uses): uses is string => typeof uses === "string")
    .filter((uses) => !TRUSTED.test(uses) && !PINNED.test(uses));

const findingsIn = (file: WorkflowFile): readonly UnpinnedAction[] => {
  const definition = parse(file.text) as { on?: unknown; jobs?: Record<string, Job> } | null;
  if (!startedByTrusted(definition?.on)) return [];
  return Object.entries(definition?.jobs ?? {}).flatMap(([id, job]) =>
    unpinnedIn(job).map((uses) => ({
      workflow: file.name,
      problem: `job "${id}" uses an action no commit pins: ${uses}`,
    })),
  );
};

export const unpinnedActions = (files: readonly WorkflowFile[]): readonly UnpinnedAction[] =>
  files.flatMap(findingsIn);
