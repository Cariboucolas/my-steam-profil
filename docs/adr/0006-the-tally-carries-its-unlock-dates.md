# The tally carries its unlock dates

`GET /api/profile/:steamId/games/:appId/completion` no longer answers a `GameCompletionDto`. It
answers an envelope of two named parts:

```
{ completion: GameCompletionDto, unlockedAt: readonly number[] }
```

`unlockedAt` holds epoch seconds for the unlocked achievements only, ascending. The library asks
this route once per game the player has ever launched — 267 of them on the account this was
measured against — so the question is whether the app can say **when** a player unlocked things
without asking for anything more than it already asks for.

It can. `GetPlayerAchievements` already carries an `unlocktime` on every entry it returns. The
Worker was downloading those dates, counting the `achieved` flags, and throwing the dates away.

## This does not undo ADR-0005

ADR-0005 dropped the schema call from this route because the schema is the larger of the two
payloads and a tally has no use for names and icons. That still holds: the route makes one Steam
call, and it is still the smaller one.

What changed is only what survives the mapping. On the heaviest game measured
(`fixtures/steam-raw/player-achievements-2066020.json`, 483 achievements, 353 of them unlocked),
Steam's response is **109.3 KB** and the Worker downloads all of it either way. The answer it
sends on goes from **59 B to 3 972 B** — **3.5 % of a transfer already made**, for the whole of
what the calendar needs. No new Steam call, no new request from the app, no second endpoint: the
existing wave over the 267 games carries it.

## What it really costs

Not the Worker's download — the phone's. Measured on the raw Steam responses kept in
`fixtures/steam-raw/`:

| game | achievements | unlocked | tally | envelope |
|---|---|---|---|---|
| 25900 | 64 | 0 | 40 B | 71 B |
| 978520 | 24 | 0 | 40 B | 71 B |
| 2066020 | 483 | 353 | 59 B | 3 972 B |
| the finished one | 500 | 500 | 45 B | 5 575 B |

A cold library of 267 tallies cost about **12 KB** before this. Afterwards it costs that plus
**eleven bytes per unlock the player has ever earned** — a ten-digit epoch and a comma. A player
with five thousand unlocks across their library pays around 65 KB; one with thirty thousand pays
around 340 KB. The cost is therefore proportional to how much the player has actually done, which
is also exactly how much calendar they have to look at.

That is a real increase and it is accepted here rather than hidden: it buys a rendering of a
year, over a connection that was already making 267 requests.

## Considered options

**A separate route for the dates** — `GET …/unlocks` — was rejected because it doubles the
number of requests a library open makes, from 267 to 534, to move bytes that were already
downloaded on the Steam side. The burst of requests is this design's real cost (ADR-0005), and
nothing that doubles it to save 3.9 KB per game is a saving.

**Widening `GameCompletionDto`** with an `unlockedAt` field was rejected on the language, not the
bytes. `CONTEXT.md` defines a GameCompletion as *the tally*: how many out of how many, and the
rate. A tally that carries 353 dates is not a tally, and every reader of one — the list rows, the
library summary — would have been handed a payload it has no use for. Two named parts cost one
`.completion` at each of those call sites and keep the definition intact.

**Sending ISO strings**, as `AchievementDto` does, was rejected on size and on work: an ISO
instant is 26 bytes against 11, and the calendar buckets a thousand of them on every wave of
tallies, where a number needs no parsing. A date that is *shown* to a reader is written once, and
those stay ISO.

## Consequences

`GameCompletionDto` is unchanged, and so is everything that reads it. What moved is the name of
what a caller holds: `CompletionByAppId` became `TallyByAppId`, `LibraryView.completions` became
`tallies`, and `ApiClient.getGameCompletion` became `getGameTally`. Mechanical, and cheaper now
than after a second client exists.

An achievement Steam flags as earned and dates at the epoch stays in the tally and out of
`unlockedAt`. That is Steam saying it does not know when, not a January morning in 1970, and it
is the same line `unlockStateFromSteam` already draws in the domain. `completion.unlocked` and
`unlockedAt.length` are therefore allowed to disagree, and a reader that needs them to agree is
asking the wrong question.

The five-minute cache from ADR-0005 keys on the request URL and is untouched. A cached entry is
simply larger.
