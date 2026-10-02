# One tool lints and formats, and the gate runs it
Biome checks the whole workspace, for lint rules and for formatting, and the `verify` job runs it
first. Nothing is formatted by hand, and nothing reaches `main` that Biome refuses.

Until #172 the compiler and the tests were the only checks. The briefs of #165 to #170 each asked
for lint to be green, and there was no lint: nothing had decided against one, it had never been
set up.

## What it binds
- `pnpm lint` is `biome check --error-on-warnings .`, read-only, and is the first step of `verify`.
  `pnpm lint:fix` writes what Biome can fix itself.
- `biome.jsonc` at the root is the one configuration. A rule switched off there carries its reason
  beside it; a finding left in the code carries a `biome-ignore` with its reason on the line above.
- The React rules are on: a hook called conditionally and an effect missing a dependency are
  errors. So are a promise nobody awaits and a focused test.
- Lines are 100 wide, because that is what the code was already written to.

## Why Biome
**The compiler does not see hooks.** A missing dependency or a conditional hook type-checks. The
move to shared queries (#162) rewrites every hook that loads, which is where that mistake is made.

**One tool, one second.** ESLint with the Expo config plus Prettier does the same with two tools,
two configurations and a plugin chain to keep in step. Biome lints and formats 340 files in about
a second, which is what lets it run first in the gate and on every save.

**It covers what was wanted.** Checked on this code rather than assumed: the rules of hooks,
exhaustive dependencies, floating promises and focused tests each fire on a file written to break
them.

## What it costs
Two of the rules that matter, `noFloatingPromises` and `noMisusedPromises`, are in Biome's
nursery: they can change or misfire between versions. Biome is pinned to an exact version for that
reason, and they are the first to go if they turn noisy.

Biome is younger than ESLint, and it showed once on the first run: `noFocusedTests` took a
function named `fit` for a focused test. The rule is confined to test files.

If a rule this project comes to need exists only as an ESLint plugin, ESLint is added for that
rule alone and Biome keeps the formatting. That is a new decision, not a reason to wait.

## What this does not say
It adds no pre-commit hook: the gate is `verify`, and an editor formats on save. It does not make
the existing suppressions permanent: those on the loading effects go with the hooks they sit in,
in #166 to #169.
