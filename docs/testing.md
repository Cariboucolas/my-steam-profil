# Testing

## Locally

```sh
pnpm test                            # every package that has tests
pnpm --filter @steam/mobile typecheck
pnpm --filter @steam/mobile exec expo export --platform ios   # validates the native bundle
```

Everything runs under Vitest except the app, which runs under `jest-expo` — the only runner able
to transpile React Native's Flow sources.

Every other command this repository has, and which of them nobody runs for you, is in
[commands.md](./commands.md).

## What CI runs

These six commands are exactly what CI executes — in this order — on every pull request and
every push to `main`:

```sh
pnpm lint           # Biome: the lint rules and the formatting (ADR-0024)
pnpm typecheck      # every package in the workspace
pnpm check:tests    # refuses a package whose tests would never run
pnpm check:stories  # refuses a component without stories, bar a list that only empties
pnpm test           # every package that has tests, listed below
pnpm build:web      # builds the web bundle, to prove that it builds
```

Cheapest first, so a type error does not wait behind a test run.

Every Storybook story is rendered by `apps/mobile/src/components/stories.test.tsx`, which finds
them on disk and renders each through `composeStories`. A story that no longer renders fails
`pnpm test`; no browser is involved, and no pixel is compared (ADR-0021).

`pnpm test` is `pnpm -r test`, so it runs wherever a package defines one:
`packages/domain`, `apps/api`, `apps/mobile`, `apps/alerts`, `tools/health-probe`,
`tools/native-build` and `tools/repo-checks`. `packages/contracts` and `tools/steam-spike` have no
tests of their own and are covered by typecheck.

No count is written down here on purpose. The one that used to be — "224 tests"
— was wrong by a factor of nearly four before anyone noticed, because a figure
like that is stale the next time anyone adds a test and nothing fails when it
rots. What is worth knowing is which packages run, and that is above.

`pnpm check:tests` guards the list above from itself: `pnpm -r test` skips a package with no
`test` script without a word, so a package created with tests but no script would leave CI green
having run none of them.

## The gate

The job is called `verify` and it is **required** before merge: `main` accepts rebase merges
only, and only from a branch that is up to date and green.

Node comes from `.nvmrc` and pnpm from the `packageManager` field, so CI cannot run on versions
other than yours.
