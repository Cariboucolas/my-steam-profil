# Dependency updates come weekly, grouped, and are read by the owner

> Amended by [ADR-0035](0035-a-preview-is-built-by-the-pull-request-and-deployed-by-main.md): a
> Dependabot pull request gets a preview, built without a secret and deployed by `main`.

Dependabot opens version updates once a week, on Monday morning, for the pnpm workspace and for
the GitHub Actions the workflows use, configured in `.github/dependabot.yml`. Minor and patch
updates are grouped: one pull request for the week's development dependencies, one for the
production ones, one for the actions. A major update keeps a pull request of its own. Every such
pull request is tier 2: the owner reads it and merges it.

## Why

Dependabot alerts were turned on on 2026-11-16 and listed 134 open alerts, 12 of them critical,
most in tools and transitive dependencies nobody upgrades by hand. Updates that arrive on their
own keep the debt from growing back; grouped and weekly, they cost one reading a week rather than
a pull request per package.

Dependabot rather than Renovate: it is built into GitHub and needs no third-party app with write
access to code, workflows and pull requests, and it groups (`groups`), schedules
(`schedule.interval: weekly`) and holds back fresh releases (`cooldown`), which is all this
needs.

## What it binds

- Two ecosystems: `npm`, the value Dependabot uses for pnpm, from `/`; and `github-actions`,
  from `/`, which reads `.github/workflows`.
- `schedule`: `weekly`, `monday`, `06:00`, `Europe/Paris`.
- `cooldown.default-days: 7`: a version is offered a week after its release rather than after
  Dependabot's default of three days, since a compromised release is usually found and pulled
  within days. Cooldown does not apply to security updates.
- `groups` by `dependency-type` (`development`, `production`) for `minor` and `patch`; the
  actions in one group. `open-pull-requests-limit` stays at its default, 5, written out.
- Commit messages follow Conventional Commits: `chore(deps)`, `chore(deps-dev)`, `ci`.
- Security updates are not configured by this file: they follow the repository's setting, which
  only the owner changes, and are not grouped (`groups` applies to version updates unless
  `applies-to: security-updates` says otherwise).

## Who judges a Dependabot pull request

- GitHub treats a workflow triggered by a Dependabot pull request as coming from a fork: its
  `GITHUB_TOKEN` is read-only and no Actions secret is passed to it. The AI reviewer of the
  trust harness, which needs a secret, therefore never runs on these pull requests. CI, through
  `verify`, is their only automatic judge.
- Each touches a manifest and `pnpm-lock.yaml`, or a workflow under `.github/`, so each is tier
  2; `.github/dependabot.yml` itself is tier 2. `risk-tiers.test.ts` holds those paths at tier 2.
- No Dependabot pull request merges automatically, whatever its tier
  ([ADR-0029](0029-a-pull-request-is-classified-by-main-not-by-itself.md)).

## What remains open

- Whether Dependabot resolves the `catalog:` protocol of pnpm workspaces was not found in
  GitHub's documentation; this workspace uses none today.
- A grouped update that breaks the build is merged by nobody: the owner splits it, or ignores
  the culprit with an `ignore` entry, by a change to this file.
