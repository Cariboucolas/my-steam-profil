# Commands

Everything this repository expects you to type, and — the part that is written down nowhere
else — **who runs each one for you**.

That last question is the one that decides whether forgetting a command matters. `pnpm
typecheck` is run again by CI on every pull request, so forgetting it costs a round trip and
nothing more. `pnpm icons:build` is run by nobody and its output is committed, so forgetting it
ships the wrong artwork with every test green. The two are indistinguishable in `package.json`.

| | Run by |
| --- | --- |
| `typecheck`, `check:tests`, `test`, `build:web` | CI, on every pull request and every push to `main` |
| The watch modes and dev servers | You, while you work — nothing to remember |
| `icons:build`, `icons:check`, `spike`, `eas build` | **Nobody.** [See below.](#the-commands-nobody-runs-for-you) |
| `deploy`, and the EAS update | The merge to `main` |

## What CI already runs for you

```sh
pnpm typecheck      # every package in the workspace
pnpm check:tests    # refuses a package whose tests would never run
pnpm test           # every package that defines a test script
pnpm build:web      # builds the web bundle, to prove that it builds
```

These four are the `verify` job, in that order, and `verify` is required before merge. Running
them yourself before pushing saves the round trip; forgetting them costs only that.

The order is deliberate — cheapest first, so a type error does not wait behind a test run.

`pnpm check:tests` is the least obvious of the four. `pnpm -r test` skips a package with no
`test` script without saying so, which means a package created with tests but no script would
leave CI green having run none of them. This refuses that package instead. It also catches test
files sitting where Expo Router would publish them as screens.

`pnpm test` runs Vitest everywhere except the app, which runs under `jest-expo` — the only
runner able to transpile React Native's Flow sources. Which packages that covers is in
[testing.md](./testing.md).

`pnpm build:web` catches what `typecheck` cannot: a missing asset, a native-only import,
anything that breaks bundling rather than compilation.

## While you are working

Nothing here guards anything. These are the short loops.

```sh
pnpm tdd                  # the domain, in watch mode — the tightest loop in the repository
pnpm test:domain          # the domain once, with coverage
pnpm test:api             # the backend once, with coverage
pnpm coverage:domain      # the domain's coverage report on its own
```

`pnpm tdd` is `vitest --watch` on `packages/domain`, which has no I/O by design: the run is
immediate, and that is what makes it the place to write a test first. Any package has the same
watch mode under its own name — `pnpm --filter @steam/api test:watch`, and so on for
`@steam/mobile`, `@steam/alerts`, `@steam/health-probe`, `@steam/repo-checks`.

```sh
pnpm dev:api                                # the backend, on :3000
pnpm --filter @steam/mobile start           # then `w` for the browser
pnpm --filter @steam/mobile start --android # onto a plugged-in phone
pnpm --filter @steam/mobile start --tunnel  # when the network refuses to cooperate
```

The backend reads `apps/api/.env` and listens on every interface, so a phone on the same network
can reach it. Getting a real phone to talk to Metro — `adb reverse`, the IPv6 case, when the
tunnel is the answer — is the long half of [development.md](./development.md).

A single package's typecheck is worth knowing for a tight loop:

```sh
pnpm --filter @steam/mobile typecheck
```

## The commands nobody runs for you

No workflow runs these. No test fails if you skip one. This is the section worth reading twice.

### The ones whose output is committed

`apps/mobile/assets/` holds seventeen PNGs, each built from an SVG beside it. Both the source
and the result are in the repository, which is what makes forgetting to rebuild invisible: the
SVG says one thing, the shipped image says another, and every test passes.

```sh
pnpm icons:build    # rewrite all seventeen from their artwork
pnpm icons:check    # say which have drifted, writing nothing
```

Run `icons:build` after touching any SVG, and commit what it writes.

`icons:check` renders the same images in memory and compares them against what is on disk, so it
is the one to run before opening a pull request that touches `apps/mobile/assets/`. It earns its
keep beyond staleness: it also compares the artwork's palette against
`apps/mobile/src/theme/mark.ts`, which is the same mark reached by a second route — the
component the splash animates one stop at a time. A colour changed on one side alone passes
every test in the repository and shows up only as a flicker at the moment the native splash
hands over, which is the kind of fault that gets blamed on the animation for a week.

**Neither is in CI, and that is a decision rather than an oversight.** `@steam/icon-build`
depends on `sharp`, a native module of roughly thirty megabytes. Putting that install in front
of every pull request and every push to `main`, to guard a subject that changes a few times a
year, is the wrong trade (#135). The check exists for a developer who knows when it applies, and
this document is where that knowledge lives.

This is not hypothetical. When the command was first written, twelve of the seventeen images had
drifted from their sources without anyone knowing (#134).

`tools/icon-build/src/recipes.ts` says what each image comes from, including the three that look
as though they could come from `icon.svg` and cannot.

`docs/images/` holds the two screenshots the README shows, each one already wrapped in a phone
bezel — GitHub strips the CSS that would draw one, so the frame has to be inside the PNG.

```sh
cd docs/images && ./frame-phone.sh ~/Desktop/capture.png library.png
```

Run it only when a screenshot changes, over the **raw** capture. Nothing drifts if you never
run it: the framed file is the only file, with no source beside it to fall out of step.
[docs/images/README.md](./images/README.md) says why it was built that way.

### The ones whose output stays outside the repository

```sh
pnpm --filter @steam/spike spike   # see tools/steam-spike/.env.example
```

Fetches Steam's raw responses into `fixtures/steam-raw/`, which is **not** in the repository: it
holds personal profile data. That directory is where the real cases quoted in tests and comments
come from — a profile whose hours Steam withholds, another that dates no session. Run it when
you need a case the fixtures do not already have.

```sh
cd apps/mobile
eas build --profile preview --platform android   # ~15 to 20 min, at Expo
```

The one human step in the whole deployment, and it happens once. An EAS update does not load in
Expo Go: it needs a build that embeds `expo-updates`. After that install, the app updates itself
on the launch following a merge, and a rebuild is only necessary when a native dependency
changes. [deployment.md](./deployment.md) has the rest.

## Deploying and probing

Every merge to `main` deploys the site, the API and the Android channel. The commands below
exist for the cases where you need to do it yourself, or watch it happen.

```sh
pnpm --filter @steam/api deploy      # wrangler deploy — deploy.yml does this on every merge
pnpm --filter @steam/alerts deploy   # the Sentry-to-Discord bridge, same thing
```

Deploying by hand skips what `deploy.yml` supplies around the command — the commit in
`--var COMMIT_SHA`, the Steam API key re-applied from the GitHub secret — so the revision the
Worker reports will be wrong. Reach for it knowingly.

```sh
pnpm --filter @steam/api dev:worker      # wrangler dev, the Worker runtime locally
pnpm --filter @steam/alerts dev:worker
```

`dev:worker` runs the real Workers runtime rather than `tsx`, which is what you want when the
question is about the platform and not the code. The revision it reports says `dev`.

```sh
pnpm --filter @steam/health-probe probe             # schedule mode, the default
pnpm --filter @steam/health-probe probe deploy      # the post-deploy window
```

The probe checks the deployed API and the alerts Worker. `schedule` is what the cron workflow
runs every fifteen minutes; it announces to Discord and opens an incident. `deploy` gives a
freshly deployed Worker a minute to start answering and announces nothing — the workflow going
red is the notification, because somebody merged a minute ago (ADR-0019). Both need `API_URL`
and `ALERTS_URL` set; the error message tells you the `gh variable set` line if they are not.

To check a merge made it all the way through:

```sh
gh release view --web                        # the release that repeats the three addresses
curl -s "$(gh variable get API_URL)/health"
```

## Elsewhere

| | |
| --- | --- |
| [development.md](./development.md) | Running it locally, and the long troubleshooting for a real phone |
| [testing.md](./testing.md) | What CI runs and why `verify` is the gate |
| [deployment.md](./deployment.md) | What is published where, the switches, where the API key lives |
