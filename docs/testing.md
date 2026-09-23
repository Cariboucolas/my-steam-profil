# Testing

## Locally

```sh
pnpm test                            # every package that has tests
pnpm --filter @steam/mobile typecheck
pnpm --filter @steam/mobile exec expo export --platform ios   # validates the native bundle
```

Everything runs under Vitest except the app, which runs under `jest-expo` — the only runner able
to transpile React Native's Flow sources.

## What CI runs

These three commands are exactly what CI executes — in this order — on every pull request and
every push to `main`:

```sh
pnpm typecheck    # every package in the workspace, all 8
pnpm test         # every package that has tests, listed below
pnpm build:web    # builds the web bundle, to prove that it builds
```

`pnpm test` is `pnpm -r test`, so it runs wherever a package defines one:
`packages/domain`, `apps/api`, `apps/mobile`, `apps/alerts`, `tools/health-probe`
and `tools/repo-checks`. `packages/contracts` and `tools/steam-spike` have no
tests of their own and are covered by typecheck.

No count is written down here on purpose. The one that used to be — "224 tests"
— was wrong by a factor of nearly four before anyone noticed, because a figure
like that is stale the next time anyone adds a test and nothing fails when it
rots. What is worth knowing is which packages run, and that is above.

## The gate

The job is called `verify` and it is **required** before merge: `main` accepts rebase merges
only, and only from a branch that is up to date and green.

Node comes from `.nvmrc` and pnpm from the `packageManager` field, so CI cannot run on versions
other than yours.
