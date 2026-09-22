# Deployment

What is published, where it goes, and the switches that stop it.

## What is live

| What | Where | Deployed by |
| --- | --- | --- |
| The site | https://steam-achievements-czo.pages.dev | Cloudflare Pages |
| The API | https://steam-achievements-api.cdcraft.workers.dev | Cloudflare Workers |
| The Android app | EAS `preview` channel | EAS Update, over the air |

Every merge to `main` deploys all three and publishes a
[Release](https://github.com/Cariboucolas/my-steam-profil/releases) that repeats these
addresses. To check a merge made it all the way through:

```sh
gh release view --web                                    # the latest release
curl -s "$(gh variable get API_URL)/health"
```

## Cloudflare Pages: the name is not the address

The Pages project is called `steam-achievements`, but its address is
`steam-achievements-czo.pages.dev`: a project's **name** is unique per account, its
**subdomain** is unique worldwide, and the short one was taken. `--project-name` in
`deploy.yml` follows the name, never the address — reading them as one and the same is an easy
mistake, and it costs a deployment.

## Where the Steam API key lives

`STEAM_API_KEY` lives in two places and nowhere else: a GitHub secret, and a Worker secret that
the deployment re-applies from the first one every time. It is in no file in the repository and
in no shipped bundle (ADR-0001, ADR-0003).

## What the Worker says when it fails

When a request fails, the Worker writes an entry to Workers Logs — on since the first
deployment — saying **which revision** it came from, which route, and whose fault it is: Steam's,
or ours. The commit arrives through `wrangler deploy --var COMMIT_SHA`, never in
`wrangler.jsonc`, which would be stale by the next commit. Under `wrangler dev` the line says
`dev`, like the app (ADR-0016).

## The deployed site carries no SteamID

The production build forces `EXPO_PUBLIC_STEAM_ID` to empty — explicitly, rather than relying on
its absence — so the app asks which profile to show, which is what makes it usable by anyone.

## Error reporting

What the two published targets report when they break goes to the Sentry project
`cdcraft/steam-achievements`, under the revision they already display. The DSN is a *variable*
and not a secret — a client DSN travels in the bundle by construction — and `deploy.yml` refuses
to build without it, because a blind production bundle looks exactly like a working one.
Emptying it is the switch, like `EAS_ENABLED`. What goes and what does not: ADR-0017. The
`SENTRY_AUTH_TOKEN` secret only uploads source maps, without which a minified stack cannot be
read.

Sentry alerts land in a dedicated Discord server through `apps/alerts` — a third Worker, which
verifies Sentry's signature and translates its JSON into a Discord message. It exists because
Sentry's native Discord integration requires a paid plan — as does the *alert rule action* a
custom integration would otherwise expose — whereas subscribing to the `issue` webhook is free
but speaks a language Discord refuses. Only the `created` action wakes anything: `resolved`,
`assigned` and the rest arrive at the same place and are discarded by the bridge.

**Nothing watches that Worker**: if it stops forwarding, the silence looks like the silence of a
system that is fine. That is the known limit of ADR-0018, written down rather than hidden.

## On a phone

The `EAS Update` workflow publishes to the `preview` channel on every merge. It stays guarded by
the `EAS_ENABLED` variable: setting it to anything other than `true` stops publications without
touching the workflow — a switch, not a waiting room. The Expo project is
`@cariboucolas/steam-achievements`; its `projectId` and `updates.url` are in `app.json`, and the
robot token is in the `EXPO_TOKEN` secret.

Then there is one human step, and only one. An EAS update does **not** load in Expo Go: it needs
a build that embeds `expo-updates`. You make one once:

```sh
cd apps/mobile
eas build --profile preview --platform android   # ~15 to 20 min, at Expo
```

The build ends with a link and a QR code: open it from the phone and install the APK. **That
wait happens only once.** After that, the installed app updates itself on the launch following a
merge — Expo downloads the update in the background on the first launch and applies it on the
next. Rebuilding an APK is only necessary when a native dependency changes, that is, when
`runtimeVersion` changes.

iOS on a real device is out of scope: it requires the Apple Developer Program (99 $/year). The
deployed site covers visual checking in the meantime.
