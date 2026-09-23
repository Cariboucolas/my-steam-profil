# Development

Everything needed to run the project on your own machine: the backend, the app, and the part
that is genuinely hard — getting a real phone to talk to Metro.

If you only want to *see* the app, you do not need any of this. The deployed site and the
`preview` channel are in [deployment.md](./deployment.md), and neither needs a shared network
or a cable.

## Repository layout

| Package | Role |
| --- | --- |
| `packages/domain` | The domain: SteamId, Playtime, CompletionRate, Timeline… No I/O. |
| `packages/contracts` | The wire DTOs shared between the backend and the app. |
| `apps/api` | The Steam proxy (ADR-0001): four endpoints, mappers and presenters. |
| `apps/mobile` | The Expo app: the profile entry screen, then the Library and Game screens. |
| `apps/alerts` | The bridge that carries a Sentry alert to Discord (ADR-0018). |
| `tools/steam-spike` | Fetches Steam's raw responses into `fixtures/steam-raw/`. |

Node comes from `.nvmrc` and pnpm from the `packageManager` field, so CI cannot run on versions
other than yours.

## Run the backend

```sh
cp apps/api/.env.example apps/api/.env   # then fill in STEAM_API_KEY
pnpm dev:api                             # http://localhost:3000
```

The server reads `apps/api/.env` if it exists, otherwise the process environment — which lets a
deployment supply its variables its own way. It listens on every interface, so a phone on the
same network can reach it.

Four endpoints, the only ones the app calls:

| Endpoint | Response |
| --- | --- |
| `GET /api/profile/:steamId` | `ProfileDto` — 404 if the profile cannot be found |
| `GET /api/profile/:steamId/games` | `GameDto[]` — empty list if the account owns nothing |
| `GET /api/profile/:steamId/games/:appId/progress` | `GameProgressDto` — 403 if the profile is private, empty 200 if the game has no achievements |
| `GET /api/profile/:steamId/games/:appId/completion` | `GameCompletionDto` — the count alone, same failures as `progress` |

Plus `GET /health`. A malformed SteamID gives 400 without a single call leaving for Steam; a
Steam outage gives 502, a bug on our side gives 500.

`completion` exists for the library screen, which calls it once per owned game: it makes do with
`GetPlayerAchievements`, whose response already carries the full achievement list with a
per-player flag. One Steam call instead of two, and the lighter of the two payloads. Its
responses are cached for five minutes; `progress` never is, because opening a game is the moment
you check that an achievement has just registered (ADR-0005).

The API key never leaves the server (ADR-0001) and appears in no response and no error message.

## Run the app

The app talks to the backend. Start it first, then:

```sh
cp apps/mobile/.env.example apps/mobile/.env   # EXPO_PUBLIC_STEAM_ID is optional, see below
pnpm --filter @steam/mobile start
```

Then `w` to open it in a browser, or scan the QR code with Expo Go.

On a phone, `localhost` means the phone itself: put your machine's LAN address in
`EXPO_PUBLIC_API_URL` (for example `http://192.168.1.10:3000`). The backend already listens on
every interface.

Expo loads `apps/mobile/.env` by itself, but **substitutes `EXPO_PUBLIC_*` at bundle time**:
after editing the file, restart the dev server. On startup it prints
`env: export EXPO_PUBLIC_...` — a variable missing from that line will not reach the app.

On first launch the app asks which profile to show: a SteamID64, seventeen digits. It remembers
it afterwards — in `localStorage` on the web, in app storage on a phone. The header's "Change"
button switches profile.

`EXPO_PUBLIC_STEAM_ID` is still useful in development: set, it saves retyping the SteamID on
every fresh install. It is **no longer required**, and an invalid value simply leads to the entry
screen instead of blocking the app.

The library header prints the bundle's **Revision**: the short commit it was built from, or
`dev`. On your machine it says `dev`, and that is the only honest answer —
`EXPO_PUBLIC_COMMIT_SHA` and `EXPO_PUBLIC_LIVE` are set by the publishing workflows and have no
business in `.env`: filling them in would make your bundle pass for the live site (ADR-0016).
`EXPO_PUBLIC_SENTRY_DSN` is the same family, and has no effect without them: a development
machine reports nothing, for want of declaring itself live.

**Expo Go**: the Play Store serves a version frozen at SDK 54 and will not update. Install the
current client from the official releases — `api.expo.dev/v2/versions/latest` points at
`github.com/expo/expo-go-releases`.

## Reaching Metro from a phone

> Everything below concerns development with Metro only.

**"Failed to download remote update"**: the phone is not reaching Metro. The Mac is serving the
bundle — check locally:

```sh
curl -s -o /dev/null -w "%{http_code}\n" "http://<mac-ip>:8081/"
```

So it is the network between the two. Most often: phone and Mac on different networks (2.4 GHz
against 5 GHz with distinct SSIDs, a guest network), or client isolation enabled on the router.
Test by opening `http://<mac-ip>:8081` in the phone's browser.

### The reliable one: a USB cable

Removes the network question entirely. The phone calls `localhost`, and the connection comes out
on the Mac.

1. On the phone: Settings → About → tap "Build number" seven times to unlock developer options,
   then Developer options → enable **USB debugging**.
2. Plug the phone in, accept the authorisation prompt that appears.
3. On the Mac:

```sh
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
adb devices                     # the device must show up as "device"
adb reverse tcp:8081 tcp:8081   # Metro
adb reverse tcp:3000 tcp:3000   # the backend
```

4. With `EXPO_PUBLIC_API_URL=http://localhost:3000` in `apps/mobile/.env`:

```sh
pnpm --filter @steam/mobile start --android
```

Expo opens Expo Go on the plugged-in device. The `adb reverse` redirections must be redone after
every unplug.

### The special case: the phone has no IPv4

Expo announces an IPv4 address in its manifest; a phone that has none cannot reach it, whatever
the state of the Wi-Fi. If both devices have an IPv6 on the same prefix, everything can move
over to it:

```sh
IP6=$(ifconfig en0 | awk '/inet6 2001/ && !/deprecated|temporary/ {print $2; exit}')
EXPO_PACKAGER_HOSTNAME="$IP6" EXPO_PUBLIC_API_URL="http://[$IP6]:3000" \
  pnpm --filter @steam/mobile start
```

The brackets around an IPv6 in a URL are mandatory. Metro and the backend already listen on both
address families; only the *announced* address changes. Beware that an autoconfigured IPv6 can
change: if the app stops reaching anything after a few days, run the command again.

### Otherwise, a workaround insensitive to network topology

```sh
pnpm --filter @steam/mobile start --tunnel
```

The traffic goes through an external tunnel. Remember to put the same public address in
`EXPO_PUBLIC_API_URL`, or the app will reach Metro but not the backend.

## Changing the icons or the splash

The SVGs in `apps/mobile/assets/` are the artwork; every PNG beside them is
built from one.

```sh
pnpm icons:build     # rewrite all seventeen
pnpm icons:check     # say whether any has drifted from its artwork, without writing
```

Run the first after touching any SVG, and commit what it writes. Nothing runs
either of these for you — neither is part of `verify`, because gating CI on them
would put a ~30 MB native dependency in every install for a check that matters
a few times a year (#135).

`pnpm icons:check` earns its keep beyond staleness: it also compares the
artwork's palette against `apps/mobile/src/theme/mark.ts`, which is the same
mark by a second route — the component the splash animates a stop at a time.
A colour changed on one side alone passes every test in the repository and shows
up only as a flicker when the native splash hands over. Worth running before a
PR that touches either.

`tools/icon-build/src/recipes.ts` says what each image comes from, including the
three that look as though they could come from `icon.svg` and cannot.

## Capturing raw Steam data

`tools/steam-spike` fetches Steam's raw responses into `fixtures/steam-raw/`. That is where the
real cases quoted in tests and comments come from — a profile whose hours Steam withholds,
another that dates no session.

```sh
pnpm --filter @steam/spike spike   # see tools/steam-spike/.env.example
```

`fixtures/steam-raw/` is outside the repository: it holds personal profile data.
