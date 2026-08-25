# The library tally is cached, the game view is not

The library asks the API how far the player has got in every game they have launched — 267 of
them on the account this was measured against. Two decisions make that affordable, and they are
the same decision applied twice: **only fetch what the answer needs, and only fetch it once.**

`GET /api/profile/:steamId/games/:appId/completion` answers with a `GameCompletionDto` and
nothing else. It calls `GetPlayerAchievements` alone, because that response already carries the
game's whole achievement list with a per-player `achieved` flag — the tally is in it. The schema
call the progress endpoint makes adds display names and icons, which a tally has no use for, and
it is the larger of the two payloads (253.8 KB against 109.3 KB on the heaviest game measured).
Dropping it halves the Steam calls and removes the heavier download.

Its answers are cached for five minutes, keyed on the request URL, through the Cloudflare Cache
API. `GET …/progress` is **not** cached, at any duration.

## Considered options

**Fanning out server-side** — one `GET /games/progress` that fetches all 267 from the Worker —
was the first idea and is the only impossible one. A Worker gets 50 subrequests per invocation on
the free plan, and **six simultaneous connections on every plan**, which turns 267 fetches into
roughly 45 sequential waves inside a single HTTP request. Parsing several megabytes of JSON also
blows the free plan's 10 ms CPU budget. The app fans out instead: each Worker invocation makes
exactly one Steam call, and the parallelism comes from the phone's connection pool, which is not
subject to Cloudflare's.

**Workers KV** was rejected on its write quota: 1,000 writes a day on the free plan, against 267
writes for a single cold library load. The Cache API has no write quota, costs nothing, and is
the right shape for what this is — an HTTP response, cached under its URL.

**Caching the progress endpoint too** was rejected because user story 10 of #2 asks for the
opposite: *"an unlock that happened minutes ago to appear when I reopen the Game"*. Opening a
game is the moment a player checks whether the thing they just earned registered. A five-minute
cache there would break the one interaction the app exists for, to save a call the player makes
deliberately and rarely. The library tally has no such promise attached: it is a column of
numbers scanned at a glance, and five minutes stale is invisible.

## Consequences

Five minutes is short enough that a player who unlocks something, backs out to the library and
looks again will usually see it, and long enough to cover the burst of 267 requests a single
library open produces. It is a guess, not a measurement — there is no usage to measure yet — and
it lives as one named constant.

The Cache API is per-datacenter, so a cold cache costs exactly what no cache costs. It amortises
repeat opens; it does not make the first one cheaper. The 267-call burst is still the design's
real cost, and if it ever needs to come down, the next lever is the app asking for fewer games,
not the server asking Steam for less.

`createApp` takes the cache as a parameter, the same way it takes the Steam gateway, and defaults
to one that stores nothing. Routes never touch `caches` directly: that global exists on Workers
and not under `tsx`, and ADR-0003 keeps platform knowledge in `worker.ts`. Tests get a cache they
can inspect, and `server.ts` runs uncached, which is what a developer watching a terminal wants.

Cache keys are full request URLs, which carry the SteamId. Two players therefore never share an
entry. Nothing player-specific is cached under a shared key, and the Steam API key appears in
outbound URLs only — never in one used as a cache key.
