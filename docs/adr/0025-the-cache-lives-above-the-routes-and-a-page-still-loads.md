# The cache lives above the routes, and a page still loads

What the app has loaded is kept in one `QueryClient`, built once in `app/_layout.tsx` and served to
every route by `QueryClientProvider`. Pages remain the only level that loads (ADR-0022): a page,
through the hooks it calls, decides what to ask and when. What changed is where the answer is
kept. It outlives the page that asked, so another screen, or the same one mounted again, reads it
instead of asking.

Decided in #162, carried out in #165 to #170. The `/stats` route needs the tallies the library has
already counted; before this, a second screen would have counted the whole library again.

## What it binds

- `src/query/query-client.ts`: `createAppQueryClient`, the only way a cache is built. The app
  builds one at module scope; every test and every story builds its own through `FreshQueries`,
  so nothing leaks between them.
- `src/query/queries.ts`: every key and every freshness, in one factory. A query function is added
  where the query is used, by whoever holds the `ApiClient`.
- `src/query/value-or-throw.ts`: the one place an expected failure is thrown.
- `src/api-client/request-queue.ts`, used by `http-api-client.ts`: the one budget of requests.
- The seams for serving data stay where they were: `jest.mock("../api-client")` for the screen
  tests, `ApiClientProvider` for the stories.

## The keys, and who they name

| Key                          | Names a SteamId | Fresh for         | Kept while unwatched             |
| ---------------------------- | --------------- | ----------------- | -------------------------------- |
| `profile`, `games`, `tally`  | yes             | five minutes      | TanStack's default, five minutes |
| `progress`                   | yes             | never             | never                            |
| `rarity`, `achievementNames` | no              | the whole session | the whole session                |

**What is the player's carries their SteamId.** A new Profile starts from empty entries and cannot
read another's. Switching Profile abandons what was still to be asked for the previous one; its
entries are not removed by hand. They are no longer shown, expire on their own, and make a quick return instant.

**`rarity` and `achievementNames` name nobody**, for the reason ADR-0008 gave the backend: every
player reads the same answer. A new Profile keeps the rarity already fetched.

**Five minutes is the backend's own duration (ADR-0005).** An answer the backend held for five
minutes can then be held five more by the app, so a tally can be up to ten minutes old. That was
accepted: a player who wants a fresh figure opens the game.

**`progress` is never served from the cache**, which is what "the game view is not cached" says.
When a GameProgress lands, that Game's tally is marked out of date, and the library mounted
beneath asks for that one tally again: one request, and the library lags the game view by no more
than it did before.

## Failures stay values, except inside a query function

The `ApiClient` port still answers `Result` (ADR-0002), and pages and hooks expose the states they
exposed before. A query knows a failure only as something its function threw, so `valueOrThrow`
turns an `err` into an `ApiFailure` carrying the `ApiError` code, inside the query function and
nowhere else, and `codeOf` reads it back on the way out. That function is the one boundary where
ADR-0002 does not hold. Anything else thrown there is read as `UNAVAILABLE`, so the screen offers to
ask again rather than wait on an answer that will not come.

## One budget of six

Every call to the backend goes through one queue of six places, whatever the screen and whichever
client asks. `useApiClient` builds a client per component, so a queue per client would have been as
many budgets as there are clients; the queue is held once, by `http-api-client.ts`. Six is what a
client opens to one host anyway.

The port takes an optional `AbortSignal`: a request still waiting when its load is abandoned is
never sent, and one in flight gives its place up. The queue has two lanes (#179): what the player
just asked to see — a profile, a library, a game — goes ahead of the counting over the library, so
a game opened mid-count waits only on the requests already in flight.

## Nothing asked that nobody asked for

`refetchOnWindowFocus` and `refetchOnReconnect` are off, and no `focusManager` or `onlineManager`
is wired on native. A recount comes from the player or not at all. A failure holds for as long as
an answer would (`retryOnMount: false`): another screen mounting the same query does not ask
again. A gesture to ask again is #164.

**One retry, on `UNAVAILABLE` only**, back through the same queue. `NOT_FOUND`, `PRIVATE_PROFILE`
and `INVALID_STEAM_ID` would answer the same a second time and are not retried. It is the one
deliberate change of behaviour the move brought.

## The fan-out kept its waves (#168)

The plan was one observed query per game, through `useQueries`. Measured before and after on an
Android `preview` build, with a 379-game account (276 worth a tally), warm medians:

| Gate                              | Before | `useQueries` | Waves through the cache | Limit    |
| --------------------------------- | ------ | ------------ | ----------------------- | -------- |
| First visible rows (T1 − T0)      | 480 ms | 321 ms       | 399 ms                  | ≤ 528 ms |
| Library counted through (T2 − T0) | 7.3 s  | 15.5 s       | 7.1 s                   | ≤ 8.0 s  |
| Longest JS gap while counting     | 300 ms | 638 ms       | 304 ms                  | ≤ 450 ms |

`useQueries` failed two gates of three: one render per tally (~276) instead of one per wave (~46),
on a JS thread that was the limit once the network was quick. The fallback agreed in advance was
taken. `useLibraryTallies`, `useLibraryRarity` and `useShownAchievementNames` still ask in waves
of six through `askInWaves`, and each answer goes through `askThroughCache`, which reads a fresh
entry or fills it with `fetchQuery`. The cache is shared as planned; each hook keeps its own
`pending` and progress state, and `request-waves.ts` stays. The web was not measured: Android
failing was enough to call for the fallback.

## What this does not say

It does not move loading out of pages. The cache is not a store a component reads to avoid its
page: a template, an organism, a molecule and an atom still take everything through their props.

It does not persist anything to the device, and the app writes nothing, so there are no mutations
and no optimistic updates. It adds nothing to `CONTEXT.md`: cache, freshness and queue are
implementation, not the player's words.

## Considered options

**A caching decorator around the `ApiClient` port.** The cheapest: a client that remembers what it
answered, injected where the client is built. Rejected because it is a hand-written subset of what
a server-state library already does — freshness per kind of answer, sharing an answer between two
askers in flight, cancelling what nobody reads, retrying — and each of those would have been
written, tested and kept here.

**A store above the routes**, holding the library's tallies for whichever screen wants them.
Rejected because it shares the tallies alone: the profile, the games, the rarity and the names
would each have needed the same, and its freshness and cancellation would have been written by
hand too.
