# Rarity is cached long and shared between players

`GET /api/games/:appId/rarity` answers what share of a Game's owners has unlocked each of its
Achievements, as Steam publishes it. Its answers are cached for **twenty-four hours**, under a
key **every player shares**.

Both halves of that read as a reversal of ADR-0005, which cached for five minutes and closed with
*"cache keys are full request URLs, which carry the SteamId. Two players therefore never share an
entry."* Neither is a reversal, and the reason is the same in both cases: **a Rarity does not
belong to the player asking.**

## The address is the mechanism

There is no shared store here, no second cache, no key-building. `cached` takes the request URL
as its key, exactly as it does for the tally. What makes this entry shared is that the address
carries no SteamId:

```
/api/profile/:steamId/games/:appId/completion   one entry per player, per game
/api/games/:appId/rarity                        one entry per game
```

That is the whole design. The route names a Game and nothing else because there is nothing else
to name — `GetGlobalAchievementPercentagesForApp` takes a `gameid` and no player, and answers the
same figures to everyone. Putting a SteamId in the address would have given every player a
private copy of an answer none of them owns.

ADR-0005's rule survives intact: **nothing player-specific sits under a shared key.** It always
was a rule about what is stored, not about how the key is spelled. The tally is a player's own
progress and must stay partitioned. A Rarity is a property of the Game, and there is no player in
it to leak.

## Twenty-four hours, against five minutes

ADR-0005 chose five minutes so that a player who unlocks something, backs out to the library and
looks again would usually see it. That promise is what pins the tally short, and it exists
because one player's action changes one player's answer.

Nothing a player does can visibly change a Rarity. The figure is a share of everyone who owns the
Game, so moving it takes a great many unlocks by a great many people; it drifts over weeks. A day
stale is invisible in a way five minutes stale would not be for a tally, and the two durations are
the same judgement applied to two different clocks — which is exactly what #53 made expressible,
by letting a route state its own lifetime instead of reading one constant.

Twenty-four hours is a bound, not a guess about hit rates. The Cloudflare Cache API is
per-datacenter and evicts on its own, so the duration is a ceiling on staleness rather than a
promise of retention: a cold cache still costs what no cache costs (ADR-0005).

## The API key stays off this call

Steam publishes these figures to anyone. This is the only call in `steam-client.ts` that names no
player and needs no key, so it now sends none — a call says whether the key belongs on it. A
secret that buys nothing is one more place it can be logged, and it would be an odd thing to
attach to the one request whose answer we deliberately share.

What this call refuses with was **measured, not reasoned** — it is the one Steam call with no
entry in `tools/steam-spike/FINDINGS.md`, the file `steam-types.ts` calls its empirical contract,
and reasoning from the sibling calls got it wrong. A Game Steam publishes nothing for answers
**403 with a bare `{}`**: not the 400 the other calls use for "no stats", and with no
`achievementpercentages` envelope at all. It is now in FINDINGS.md, and both facts have tests
naming the appIds they were measured on.

## Nothing published is answered as nothing

An Achievement Steam publishes no readable figure for is **absent from the answer**, and a Game it
publishes nothing about is an **empty list**. Never zeroes.

"Readable" is doing real work, because Steam sends the figure as **text**: `"percent":"93.9"`, on
every entry of every response measured. Reading one is a step that can fail, and `Number("")` is
`0` — so an unreadable figure that was merely coerced would arrive as the rarest achievement in
the library. It is dropped instead.

This is the rule `CONTEXT.md` states for Rarity, and it is load-bearing rather than tidy. Rarity
reads backwards to every other percentage in this codebase: 0.4 is a trophy almost nobody holds.
A missing figure filled in as `0` would therefore rank as the rarest thing the player owns, and a
Game answered as a list of zeroes would fill the top of the ranking #31 builds with achievements
nobody has measured. The absence has to survive to the caller, so it is expressed as absence.

Steam rounds to one decimal, so two Achievements are published exactly equal often rather than
rarely — on appId 2066020's 483 achievements, `62.9`, `53.4`, `53.0`, `52.1` and `49.7` each
appear twice. Nothing here rounds again or nudges them apart: the ranking downstream has to see a
tie to extend past it, and a tie broken on noise is a ranking that misleads without anyone
noticing.

## Considered options

**Caching this the way the tally is cached** — five minutes, keyed with the SteamId — was the
path of least thought, and it is wrong twice over. It would make 267 players fetch the same 20 KB
267 times, and it would expire an answer that had not changed. The cost this whole feature is
built to avoid is Steam calls (ADR-0005); a per-player key here would restore them for nothing.

**Not caching at all**, as `…/progress` is not cached, was rejected because the reason `progress`
stays live does not apply. That route is uncached so a fresh unlock shows the moment a player
looks (user story 10 of #2). No such moment exists for a Rarity: there is no action a player can
take and then check.

**Caching for a week** was considered and rejected as more staleness than the feature needs, for
a saving that is hard to observe — the Cache API evicts long before a week on a quiet
datacenter, so the extra six days would mostly be a claim rather than a behaviour.

## Consequences

`RARITY_CACHE_SECONDS` lives beside `TALLY_CACHE_SECONDS` in `app.ts`, as one named constant per
route. Neither says anything about the other, which is the point of #53.

The answer carries no display name, and cannot: this call never fetches the schema — the 253 KB
payload ADR-0005 removed from the library's hot path. An Achievement is identified here by the
apiName it is known by within its Game. Whatever needs to *show* one of these rows has to fetch
the schema for that game, and #31 does so for the handful of games that carry the rows shown.

`ApiClient.getGameRarity` is built off the api root rather than the player's root — the one
address in the app that names no player. The fixture client answers it from data it does not
have: the spike never called this Steam endpoint, so a fixture set carries rarity only if a test
puts it there, and a set without it answers with nothing. That is the same answer the backend
gives for a Game Steam publishes nothing about, so no screen learns to tell the two clients apart.

## The same rule, applied to the game schema (extended 2026-09-09, #57)

`GET /api/games/:appId/achievements` answers what a Game calls each of its Achievements and the
icon it draws them with. It is cached for the same twenty-four hours, under an address carrying no
SteamId, and it needs no argument of its own: **how a Game names an award does not belong to the
player asking**, exactly as a Rarity does not. Everything above holds word for word with *Rarity*
read as *the name a Game gives*.

Reusing `…/progress`, which already fetches the schema, was considered and rejected. That route is
the 253 KB answer partitioned by player — it crosses the schema with one player's unlocks — so it
could never sit under a shared key, and reaching for it here would have put back into a secondary
tab the cost ADR-0005 was written to remove.

Two things do differ, and neither changes the decision:

**The API key stays on this call.** `GetSchemaForGame` requires it where
`GetGlobalAchievementPercentagesForApp` does not. The key is about what Steam will answer, not
about who is asking us: what makes an entry shareable is that no player is named in the question,
and there is none in this one either.

**Only three of the schema's seven fields are forwarded** — `apiName`, `displayName`, `icon`. The
schema is the payload ADR-0005 removed from the library's hot path, and its caller here is a ranked
row that shows a name over a game name. `description`, `hidden` and the grey icon belong to the
game screen, which fetches the schema itself through `…/progress` and is not cached at all. So the
entry kept for a day is a fraction of what Steam sent, and the heavy payload never becomes
something the service stores.

## What bounds the cost, since a shared key does not

A cache makes the second ask free; it is the number of first asks that had to be bounded, and the
address cannot do that. What does is **when** the question is asked: the ranking is decided on the
published figures alone, and only then are the three to six games carrying the rows *actually
shown* asked to name them. Which games are worth the schema is a property of the answer, not of the
library — so this fetch can never precede a ranking, and never grows with the 267 games a library
holds (#31).

An Achievement its Game says nothing about keeps the apiName it was ranked under. A row earned its
place on a figure Steam published and a day the player unlocked it, and a later answer about its
name cannot take that back — a poor name is not a blank row, and a dropped one would make the
ranking disagree with itself between two loads.
