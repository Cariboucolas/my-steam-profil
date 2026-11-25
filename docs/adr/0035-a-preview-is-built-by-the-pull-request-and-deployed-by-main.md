# A preview is built by the pull request and deployed by main

Every pull request of this repository gets a preview of the app and of the gallery, Dependabot's
included. `preview.yml`, started by `pull_request`, builds the two bundles and holds no secret.
`preview-deploy.yml`, started by `workflow_run` when Preview completes, runs as `main` has it,
deploys those bundles to Cloudflare Pages with the token and posts the links. The pull request's
code runs where there is no token, and the token is used where none of that code runs.

## What it amends

[ADR-0031](0031-dependency-updates-come-weekly-grouped-and-read-by-the-owner.md) made `verify`
the only automatic judge of a Dependabot pull request. Its preview job ran and failed on every one
of them: on `pull_request`, GitHub passes no Actions secret to a run Dependabot triggered, so
`CLOUDFLARE_API_TOKEN` was empty and wrangler stopped. A Dependabot pull request now gets its
preview, as any other does. `verify` stays the only required check.

## Why

A preview shows what CI does not: a page that builds green and draws wrong. That matters most for
an update of the libraries the app runs on, which is what Dependabot opens every week.

Two ways to give that run the token were ruled out:

- Storing `CLOUDFLARE_API_TOKEN` as a Dependabot secret. The build installs the updated
  dependencies and runs their code; the run that holds the token would be the one a compromised
  release reaches first. GitHub withholds the secrets for exactly that reason.
- Deploying from `pull_request_target`. It runs with `main`'s secrets, and building the pull
  request there means running the pull request's code with them, which ADR-0029 forbids.

Splitting the two keeps each side's rights apart: the code of the pull request (and of what it
installs) never meets the token, and the token never meets anything but static files.

## What it binds

- `preview.yml`: `pull_request`, `contents: read` only, same-repository pull requests, one run per
  pull request with a newer push cancelling the older. It builds both bundles as before and
  uploads `dist` and `storybook-static` as the artifact `preview`, kept three days. It no longer
  deploys nor comments.
- `preview-deploy.yml`: `workflow_run` on Preview `completed`, only for a run of event
  `pull_request` that succeeded. Permissions `{}` for the workflow; the job alone has
  `contents: read`, `actions: read` and `pull-requests: write`.
- What it knows of the pull request comes from the API, never from the artifact: the run must list
  exactly one pull request of this repository, open, whose head is still the commit built. The
  branch name is checked against what a branch name may contain before it reaches a command, and
  `main` is refused, since Pages serves the production branch as the live site.
- The artifact is data. It is downloaded under `$RUNNER_TEMP`, outside the checkout of `main`, and
  refused if it lacks either bundle or holds a `_worker.js`, a `_routes.json` or a symbolic link:
  Pages would run the first, route to it with the second. Nothing of it is installed or executed.
- The checkout, the lockfile and the wrangler that deploys are `main`'s, with
  `persist-credentials: false`. `--commit-hash` names the built commit, since the checkout is not
  it. Third-party actions are pinned to a commit SHA (ADR-0033).
- `pnpm check:workflows` reads `preview-deploy.yml` like every workflow `workflow_run` starts: no
  checkout, fetch or expression of the pull request's head, no unpinned third-party action.
- Like `preview.yml` before it, it publishes a preview, never `main`: ADR-0027 does not govern it.

## What remains open

- `workflow_run` runs the workflow as the default branch has it: the pull request that introduces
  `preview-deploy.yml` gets no preview, and the split is only proven by the first pull request
  after the merge, then by the first Dependabot one.
- GitHub documents its Dependabot restrictions for `pull_request` and the other events a
  Dependabot pull request triggers (`push`, `pull_request` and the review events); it lists no
  such restriction for `workflow_run`. That the deploying run gets the token after a Dependabot
  build is inferred from that silence, and observed only once it happens. If it does not, the
  run finds the token empty, says so in its summary and stops green: no preview, and no red
  check either.
- Two builds of the same pull request that both succeed can deploy in the wrong order: the newer
  push usually cancels the older build, and the deployment checks the head when it decides, but a
  slow deployment of the older commit can still finish last. The next push corrects it.
- The deployed bundles are the pull request's code, served from Pages, as before this decision: a
  preview is not the live site, and a malicious dependency would show there before it ever
  reaches `main`.
