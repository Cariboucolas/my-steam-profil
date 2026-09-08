# The tally names its unlocks

`GET /api/profile/:steamId/games/:appId/completion` no longer answers dates alone. Its second
named part becomes a list of the unlocks themselves:

```
{ completion: GameCompletionDto, unlocks: readonly { apiName: string, at: number | null }[] }
```

One entry per unlock the tally counted, dated ones earliest first and undated ones last.

**Amends ADR-0006**, which gave the same part the name `unlockedAt` and filled it with epoch
seconds and nothing else.

## Why a date is not enough

A Rarity is published **per Achievement**, keyed by `apiName` (ADR-0008). A player's unlocks were
carried as a bare list of instants. Crossing the two is what the rarest-unlocks ranking is — and
there is nothing to cross on: an instant does not say *which* achievement fell on it, and Steam
publishes no instants at all.

The ranking cannot be moved to the backend to avoid this. ADR-0008 keeps rarity under an address
carrying no SteamId precisely because the figure does not belong to the player asking; a route
that joined it to one player's unlocks would be player-specific again, and would lose the shared
cache that makes the whole tab affordable. **The join belongs on the client, and the client needs
both sides of it.**

## The undated unlock stops being invisible

ADR-0006 dropped an unlock Steam dates at the epoch — Steam saying it does not know when — and
closed with *"`completion.unlocked` and `unlockedAt.length` are therefore allowed to disagree."*
That was reasonable while the part existed for a calendar, which has no day to draw such an
unlock on.

It is not reasonable for a ranking. A rare unlock is no less earned for Steam having lost its
date, and dropping it would make the rarest thing a player owns silently absent from a list whose
whole purpose is to name it. It is now carried like any other, with `at: null` rather than an
invented day, and **sorted last**: an undated unlock has no place on the scale the others share,
and either end of that scale would state a day Steam refused to state.

So the two figures now agree by construction: `unlocks.length === completion.unlocked`, always. A
reader finding otherwise is reading a bug. The calendar skips a null `at` where it previously
never received the entry — the same line, drawn one step later.

## What it costs

Measured on the raw Steam responses in `fixtures/steam-raw/`, comparing the two shapes of the
part alone:

| game | unlocked | `unlockedAt` | `unlocks` | gzipped |
|---|---|---|---|---|
| 2066020 | 353 | 3 884 B | 19 474 B | 779 B → 2 922 B |
| 25900, 978520, 2694490 | 0 | 2 B | 2 B | unchanged |

Per unlock: **11 B becomes 55 B**, and about **2 B becomes 8 B** once compressed — an `apiName`
repeats its shape on every entry, which is exactly what a compressor eats. A player with five
thousand unlocks across their library therefore pays around 40 KB gzipped where they paid around
10 KB, on a library open that already makes 267 requests.

That is a real increase and it is accepted here rather than hidden, for the same reason ADR-0006
accepted its own: it buys a whole feature on a download already made, with **no new Steam call, no
new request from the app, and no second endpoint**. Steam's own response carries `apiname` on
every entry; the Worker was reading it and throwing it away.

## Considered options

**A second route for the names** — `GET …/unlocks` — was rejected on the same ground ADR-0006
rejected it: it doubles a library open from 267 requests to 534 to move bytes already downloaded
on the Steam side. The burst is this design's real cost (ADR-0005).

**Sending the names only, and keeping the dates in a parallel array** was rejected on honesty
rather than size. Two arrays that must be read together are one array with the pairing left to
every reader to get right, and the pairing is what breaks first.

**Fetching the schema to recover names later** was rejected outright: the schema is the 253 KB
payload ADR-0005 removed from the library's hot path, and the ranking needs no display name to
rank — only phase two, for the three to six games actually shown, does.

## Consequences

`GameCompletionDto` is unchanged, and so is everything that reads it. `GameTallyDto.unlockedAt`
becomes `GameTallyDto.unlocks`, and the domain-side `GameTally` follows; `Unlock` is a named
shape in both. The calendar reads `unlock.at` and skips a null. The fixture client reads its
unlocks off the stored achievements rather than off the Timeline, because the Timeline holds only
what Steam dated.

ADR-0006's measurements stand as the record of what the dates cost. This ADR is the record of what
naming them costs on top.
