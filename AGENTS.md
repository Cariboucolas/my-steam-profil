# Agent contract

Steam Achievements: point it at a public Steam profile and it says what that profile has finished.
An Expo app (`apps/mobile`, web and Android) over a Cloudflare Worker that proxies Steam
(`apps/api`), in a pnpm monorepo. No sign-in, no account, no database.

## Commands
Node from `.nvmrc`, pnpm from `packageManager`. `verify` in `.github/workflows/ci.yml` runs, in order:

```sh
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm check:tests && pnpm check:stories && pnpm check:workflows
pnpm test && pnpm build:web
```

`pnpm lint:fix` formats. One package: `pnpm --filter <name> test`. Every other command, and who
runs it, is in [docs/commands.md](docs/commands.md).

## What has authority
- [CONTEXT.md](CONTEXT.md): the domain vocabulary; code and prose use its words.
- [docs/adr/README.md](docs/adr/README.md): every decision and what it amends. A change that
  contradicts an ADR says so and amends it with a new one; it never rewrites one.
- [docs/testing.md](docs/testing.md), [docs/deployment.md](docs/deployment.md),
  [docs/development.md](docs/development.md), [docs/agents/](docs/agents/).
- `apps/mobile/AGENTS.md`: the Expo version whose docs are the reference.

## Architecture
Level 2, an application ([ADR-0026](docs/adr/0026-the-project-is-an-application-not-a-domain.md)):
the five atomic levels in front, routes → `SteamGateway` → Steam behind. Level 3 only by an ADR,
on the signals ADR-0026 lists.

## Risk tiers
A change takes the highest tier of any path it touches, and its pull request says which.

**Tier 2: the owner reads it before merge.**
- Guardrails: `AGENTS.md`, `**/AGENTS.md`, `**/CLAUDE.md`, `**/.claude/**`, `.cursor/**`,
  `docs/agents/**`, `docs/adr/**`, `tools/repo-checks/**`
- CI and the gate: `.github/**`, `package.json` (root), `pnpm-workspace.yaml`, `.nvmrc`,
  `biome.jsonc`, `tsconfig.base.json`, `**/vitest.config.ts`, the `jest` key of
  `apps/mobile/package.json` (coverage thresholds)
- Infrastructure and deployment: `apps/*/wrangler.jsonc`, `apps/*/src/worker.ts`,
  `apps/mobile/app.json`, `apps/mobile/eas.json`, `apps/mobile/metro.config.js`,
  `tools/health-probe/**`, `tools/native-build/**`
- Secrets: `**/.env.example`, `apps/api/src/http/config.ts`, `apps/api/src/http/failure-log.ts`
- Authentication: `apps/alerts/src/signature.ts`, the only one; nothing else signs anyone in
- Data deletion: `apps/mobile/src/settings/**`, where the stored SteamID is kept and forgotten

**Tier 1: merged unread when `verify` is green, the change carries its proof — a test that
failed before it, or a story or preview for what is seen — and an AI review independent of its
author found nothing.** Every other path under `apps/`, `packages/` and `tools/`, and any change
to a runtime dependency.

**Tier 0: merged on a green `verify`.** `README.md`, `CONTEXT.md`, `docs/**` outside
`docs/adr/` and `docs/agents/`; a patch or minor bump of a `devDependencies` entry, with its
`pnpm-lock.yaml`, in a `package.json` that is not tier 2.

## Invariants
Each holds because a check fails without it. A rule nothing checks is not listed here.

| Invariant | Checked by |
| --- | --- |
| Nothing leaves `main` unless CI passed on that commit (ADR-0027) | `pnpm check:workflows` |
| Lint rules and formatting hold everywhere (ADR-0024) | `pnpm lint` |
| Every package type-checks | `pnpm typecheck` |
| A package with tests runs them; no test file sits where Expo Router publishes it | `pnpm check:tests` |
| A component below `pages/` has stories, the exception list only shrinks, a template is shown by its page | `pnpm check:stories` |
| Coverage stays above each package's thresholds (100 % in `packages/domain`) | `pnpm test` |
| `en` and `fr` hold the same keys and every plural form (ADR-0023) | `pnpm test` (`catalogs.test.ts`) |
| The lockfile agrees with the manifests | `pnpm install --frozen-lockfile` |
| The web bundle builds | `pnpm build:web` |
| No bundle ships without its API address, its Sentry DSN, its source maps; no gallery calls `require()` | the `web` and `gallery` jobs of `deploy.yml` |
