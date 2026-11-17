# A pull request is classified by main, not by itself

The risk tier of a pull request, and who merges it, are computed by `risk-tier.yml`, a workflow
started by `pull_request_target`. GitHub runs that trigger as the default branch has it, so the
workflow, the classifier and its table are `main`'s, whatever the pull request changes. The
workflow never checks out, fetches or runs the pull request's code: it reads the paths it
touches through GitHub's API. `pnpm check:workflows` refuses any `pull_request_target` workflow
that would reach the pull request's head.

## What it amends
[ADR-0028](0028-a-risk-tier-is-computed-not-declared.md) computed the tier in the `Risk tier`
step of `ci.yml`, with the base branch's classifier. It left one hole open: on `pull_request`,
GitHub runs the pull request's own `ci.yml`, so a pull request could rewrite the step and show
any tier, tier 0 included. The step is removed from `ci.yml`; its guard ("a change touching what
computes the tier is tier 2") goes with it, since a pull request can no longer touch what
computes its own tier. Everything else 0028 binds holds: paths only, the highest tier wins, a
path no tier lists is tier 2, both names of a rename count.

## Why
A tier that will one day decide whether a pull request merges without the owner must come from
code the pull request cannot edit. `pull_request_target` is GitHub's trigger for that: "This
event runs in the context of the default branch of the base repository" (GitHub, *Events that
trigger workflows*). The price is GitHub's own warning: the same trigger runs with the base's
token, and running a pull request's code there may grant "unintended access to write privileges
or secrets". So the workflow reads data only, and a check keeps it that way.

## What it binds
- `risk-tier.yml` runs on `opened`, `synchronize`, `reopened` and `ready_for_review`, with
  `contents: read` and `pull-requests: read`, one run per pull request at a time.
- It checks out `main` (the trigger's default) with `persist-credentials: false`, sets up the
  Node of `.nvmrc`, and asks the API for the pull request and every page of its files. Plain
  `node` runs `tools/repo-checks/src/pull-request-tier-cli.ts` on those two answers, saved as
  files: nothing of the pull request is installed or executed, and its paths are data.
- A renamed file counts under `filename` and `previous_filename`. GitHub lists 3000 files at
  most: when it lists fewer than the pull request's `changed_files`, the tier is 2.
- An answer the classifier cannot read fails the step rather than reading as no change.
- The summary names the tier, the paths that decide it, and who merges. A pull request from a
  fork, or whose author is `dependabot[bot]`, is merged by the owner whatever its tier: its CI
  runs without the repository's secrets, so the AI reviewer never reads it. No tier merges
  automatically yet; the owner merges every pull request, as before.
- `pnpm check:workflows` reads every workflow `pull_request_target` starts and refuses: an
  `actions/checkout` (in any case) with a `ref` or a `repository`, or without
  `persist-credentials: false`; a `run` that calls `git fetch`, `checkout`, `switch`, `pull`,
  `clone` or `worktree`, or `gh pr checkout`; a `run`, `with` or `env` naming `refs/pull/`, a
  `tarball` or a `zipball`; a job calling a reusable workflow, which none of these rules would
  read; any expression naming `github.head_ref`, `github.event.pull_request.head`,
  `merge_commit_sha` or `github.event[…]`, in any case. Its test runs on this repository's
  workflows too.
- A change to any workflow stays tier 2 (`.github/**`), and is read by the owner.
- `pnpm check:tier <base>` stays, for a branch before it is a pull request; it shares its report
  with the workflow.

## What remains open
- The check reads a workflow's text; it does not prove a workflow safe. A step that downloads
  the head by a route it does not list, or a script in `main` that does, would pass. What covers
  that is the tier: such a change is tier 2.
- The run of the pull request that introduces `risk-tier.yml` shows no tier: the workflow does
  not exist on `main` yet. The first pull request after the merge is the first one classified.
- The tier is not a required check: nothing yet merges or holds a pull request because of it.
  Doing so is ADR-0030's subject.
