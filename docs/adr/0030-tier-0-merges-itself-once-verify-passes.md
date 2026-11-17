# Tier 0 merges itself once verify passes

A pull request of tier 0 — `README.md`, `CONTEXT.md`, `docs/**` outside the guardrails — merges
without the owner once `verify` has passed on its head. `merge-tier-0.yml` does it, started by
`workflow_run` when CI completes. Tiers 1 and 2 are merged by the owner, as before; tier 1 will
follow once the AI reviewer's observation period has been assessed.

## What it amends
[ADR-0029](0029-a-pull-request-is-classified-by-main-not-by-itself.md) said no tier merged
automatically yet. Tier 0 now does. The rest of 0029 holds, and binds this workflow too: it runs
as `main` has it, and never checks out, fetches or runs the pull request's code.
[ADR-0028](0028-a-risk-tier-is-computed-not-declared.md) said the tier blocks nothing; it still
holds nothing back, but it now lets tier 0 through.

## Why
A pull request that changes prose outside the guardrails cannot change what is built, deployed,
checked or decided; reading it before merge costs the owner more than a mistake in it would.
The owner's attention goes to tiers 1 and 2.

## How
- `workflow_run` on the `CI` workflow, `completed`, when the run's event is `pull_request` and
  its conclusion `success`. CI's runs called from `main`'s publishing workflows are named after
  their caller, so they never start this one.
- The job alone has `contents: write` and `pull-requests: write`; the workflow grants nothing.
- It reads the run through the API: exactly one pull request listed, and the commit `verify`
  passed on. A fork's pull request is never listed on the run, so it stops there.
- The paths classified are those of the verified commit itself, from
  `GET /repos/{owner}/{repo}/compare/{base.sha}...{verified}`, both ends SHAs. The pull request's
  own list of files follows its head: a push of a tier 0 commit and back between that list and
  the merge would have had a tier 2 commit merged on the tier of another. GitHub lists 300 files
  of a comparison at most, on its first page: at 300, the tier is 2.
- `main`'s classifier, run by plain `node` on those answers, decides who merges: automation for
  tier 0 only, never for a fork, a `dependabot[bot]` pull request, a draft, or a pull request
  whose base is not `main`. It ignores case: on a case-insensitive disk, as macOS has by
  default, `docs/ADR/x.md` lands in `docs/adr/`, so it is tier 2 like it.
- It merges through `PUT /repos/{owner}/{repo}/pulls/{number}/merge` with `sha` set to the head
  the decision was made on, and only when that head is the commit `verify` passed on: a push
  after the decision makes GitHub refuse the merge. `merge_method` is `rebase`, the only method
  the repository allows. Branch protection still applies: up to date with `main`, `verify`
  required; a pull request behind `main` fails the merge and is left to the owner.
- `pnpm check:workflows` holds `workflow_run` workflows to the rules `pull_request_target` ones
  follow, and refuses an expression naming the triggering run's head (`head_sha`, `head_branch`,
  `pull_requests`): the workflow reaches them through the API, by the run's id.

## What it costs: no deployment
GitHub's documentation: "events triggered by the `GITHUB_TOKEN` will not create a new workflow
run", `workflow_dispatch` and `repository_dispatch` aside. A merge made with the workflow's token
therefore starts neither `deploy.yml`, nor `eas-update.yml`, nor `eas-build.yml`. That is
accepted rather than worked around:
- tier 0 paths feed nothing that is built, so what is live is what `main` would deploy;
- the deployed revision (ADR-0016) lags behind `main` by those commits until the owner's next
  merge, whose workflows run CI on `main` first and deploy everything;
- ADR-0027 holds: nothing leaves `main` without CI passing on that commit, since nothing leaves.

Dispatching the publishing workflows after the merge was weighed and set aside: more write
permissions (`actions: write`) for a deployment that changes nothing. A token of a machine
account would start them, at the cost of a secret; that belongs to the decision on the agents'
GitHub identity.

## What remains open
- Who GitHub records as merging, and whether branch protection accepts the token's merge, are
  not stated by its documentation: the first tier 0 pull request after the merge shows it.
- `README.md`, `CONTEXT.md` and `docs/**` outside `docs/adr/` and `docs/agents/` are tier 0,
  and `AGENTS.md` names `CONTEXT.md`, `docs/testing.md`, `docs/deployment.md` and
  `docs/development.md` as having authority over agents: a change to them merges unread. Whether
  they move to tier 2 is the owner's decision; the table in `AGENTS.md` decides.
- Native auto-merge was not used: it needs the repository's "Allow auto-merge" setting, which
  only the owner changes, and stays enabled across a later push that could raise the tier.
