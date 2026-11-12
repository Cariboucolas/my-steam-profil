# Nothing leaves main unless CI passed on that commit
A workflow that publishes from `main` — the Workers, the site, the gallery, the EAS update, the
EAS build — calls `ci.yml` first, and every job it runs waits on that call. A commit whose CI is
red publishes nothing, wherever it is published to. `pnpm check:workflows`, a step of `verify`,
refuses a workflow that breaks this.

## Why
On 2026-10-06, `deb7697` reached `main` with CI red and every publication green. `ci.yml`,
`deploy.yml`, `eas-update.yml` and `eas-build.yml` each started on the same push and ran side by
side: nothing told a deployment to wait for the verdict, so it never did.

The pull request had been checked, and `verify` is required before merge. That is not the same
commit: a rebase merge puts on `main` a combination of changes no pull request ran, and branch
protection only ever looked at the pull request. The only check that sees what is about to ship
is one run on the commit that ships, before it ships.

## What it binds
- `ci.yml` is a reusable workflow (`workflow_call`) and has no `push` trigger of its own. The
  workflows that publish from `main` run it: since #202 `deploy.yml`, since #203 `eas-update.yml`
  and `eas-build.yml`.
- In each of them a job calls `./.github/workflows/ci.yml`, and every other job `needs` that job,
  directly or through a job that does. A job that waits on it carries no `if:` with `always()`,
  `failure()` or `cancelled()`, which would run it after a red CI anyway.
- A new workflow started by a push to `main` follows the same shape, or `verify` fails.
- The check reads `.github/workflows/` alone. It is `tools/repo-checks/src/ungated-workflows.ts`,
  and its tests hold a faulty workflow of each kind it refuses.

## What it costs
CI runs once per publishing workflow on every merge, up to three times, in parallel. Its
concurrency group carries the caller's name so the three runs do not cancel one another. That is
minutes of runner time a public repository does not pay for, and a merge that publishes a few
minutes later than it used to.

## What this does not say
It does not make CI run on a push to a branch other than `main`; pull requests are checked
through `pull_request`. It does not cover `health.yml` or `preview.yml`: the first publishes
nothing, the second publishes a preview of a pull request, never `main`. And it says nothing of
a publication started by hand outside GitHub Actions — `eas update` or `wrangler deploy` from a
laptop — which nothing here can see.
