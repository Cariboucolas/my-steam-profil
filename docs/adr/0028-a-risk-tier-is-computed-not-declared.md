# A risk tier is computed, not declared
The risk tier of a pull request is computed by CI from the paths it touches, against the table
in `AGENTS.md`, and written in the summary of its `verify` job. Its author does not choose it.
While the owner merges every pull request, the tier informs and blocks nothing.

## Why
A tier its author declares is only as good as the author's reading of a table, and the author
most likely to misread it is an agent whose change would gain from a lower tier. The paths a
change touches are a fact git can state; the tier that follows from them should be one too.

The table and the code must not become two tables. The globs live once in
`tools/repo-checks/src/risk-tiers.ts`, and `risk-tiers.test.ts` reads the bullets of `AGENTS.md`
and fails when a tier lists a glob the code does not hold, or the other way round.

## What it binds
- A change takes the highest tier of any path it touches; a path no tier lists is tier 2.
- A deleted path counts, and a renamed one counts under both its names: the diff is read with
  `--no-renames`, from `base...HEAD`, so what the base gained meanwhile is not the change's.
- Only paths are read, never content. Two rules of the table depended on content, and both now
  take the higher tier:
  - a patch or minor bump of a `devDependencies` entry was tier 0. It changes `pnpm-lock.yaml`,
    and telling such a lockfile change from any other means trusting a parse of the lockfile
    nothing here can check. The lockfile is tier 2, so every dependency change is tier 2;
  - the `jest` key of `apps/mobile/package.json` was tier 2 and the rest of the file tier 1. The
    whole file is tier 2. A dependency change there was already tier 2 through the lockfile, so
    this costs only a change to its scripts.
- `pnpm check:tier <base>` prints the tier and the paths that decide it. In `ci.yml` it runs on
  `pull_request` alone, against the first parent of the merge commit GitHub checks out, and
  writes to the job summary and a notice. It needs no permission the job did not already have,
  labels nothing and comments nothing.
- The step fails only when the tier cannot be computed, never because of the tier it finds.

## What this does not say
It does not enforce the tiers: no pull request is merged or held because of its tier, and the
owner still merges every one. Enforcing them is a decision of its own, which will amend this
one. It does not judge content: a tier 1 file can still hold something the owner would want to
read, and the tier says so no better than the table does.
