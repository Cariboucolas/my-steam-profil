# Testing

## Locally

```sh
pnpm test                            # domain, api, mobile
pnpm --filter @steam/mobile typecheck
pnpm --filter @steam/mobile exec expo export --platform ios   # validates the native bundle
```

The domain and api tests run under Vitest; the app's run under `jest-expo`, the only one able to
transpile React Native's Flow sources.

## What CI runs

These three commands are exactly what CI executes — in this order — on every pull request and
every push to `main`:

```sh
pnpm typecheck    # the workspace's 6 packages
pnpm test         # 224 tests: domain, api, mobile
pnpm build:web    # builds the web bundle, to prove that it builds
```

## The gate

The job is called `verify` and it is **required** before merge: `main` accepts rebase merges
only, and only from a branch that is up to date and green.

Node comes from `.nvmrc` and pnpm from the `packageManager` field, so CI cannot run on versions
other than yours.
