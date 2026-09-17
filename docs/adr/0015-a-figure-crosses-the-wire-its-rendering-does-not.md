# A figure crosses the wire, its rendering does not

Every type in `packages/contracts` carries figures, identifiers and ISO dates. None carries the
text a reader sees. What a number looks like is decided by the screen that draws it.

## Where it already applies

After #101 this is true of the whole package, not a habit some files happen to follow:

- `GameDto` carries `playtimeMinutes`, and the two screens that show hours write them differently
  on purpose — `83 h` in a library row, `82 h 57` on the game screen.
- `GameRarityDto` carries Steam's own figure and Steam's own rounding, and nothing else.
- `GameTallyDto`, `ProfileDto` and `GameProgressDto` carry counts and dates.

`playtimeLabel` was the single exception, and it is the reason this decision is written down. It
was added so that every client would format playtime identically, and the only client there has
ever been already formatted it two ways — neither of them the one the wire carried.

## Why

**A rendering has a reader, and the wire does not know who it is.** ADR-0010 puts the app's
language in the app's hands, English first and French next. A Worker rendering `82 h 57` is
rendering it for nobody in particular, and cannot be told which language the reader chose.

**A rendering is a layout input.** ADR-0011 and ADR-0013 make the width of a figure the thing that
decides whether a line fits. A component that reasons about what it will draw cannot be handed a
string produced by a process that has never seen the layout.

**A derived field only guarantees consistency if nobody can derive it locally.** Whoever holds the
minutes can always format them, so the guarantee is unenforceable the moment the raw figure travels
beside its rendering. Carrying both buys the risk of disagreement and none of the consistency it
was bought for.

**Two nullable halves of one fact can disagree.** This is what made the exception a defect rather
than a redundancy: `playtimeMinutes` and `playtimeLabel` were null together or not at all, and only
a comment said so. A figure has one absence; a figure beside its rendering has two, and three of
the four states they admit are nonsense.

## What this does not say

It does not say clients must each write their own formatter. `formatPlaytimeExact` lives in
`@steam/domain` and is shared, as a rule; it is the *choice to apply it* that stays with the
screen. Sharing a formatter and shipping a formatted string are different things.

It does not cover text that is data rather than rendering: a Game's `name` and an Achievement's
`displayName` are Steam's own strings, not our writing of a figure.

## Considered options

**Keep the label and align the client's formatter to it.** The only option that would have made the
original guarantee true. Rejected: it moves the rounding of a figure to a process that cannot see
the line the figure must fit, which ADR-0011 spent an issue establishing.

**Keep the label for the exact figure and derive the rounded one.** Rejected as the worst split: the
next reader has to know which of the two figures is authoritative, and the answer would depend on
the screen.

**Wrap the two halves in a nested object, so they cannot disagree.** The shape #101 first proposed.
Rejected once the label turned out to have no reason to cross at all: a wrapper makes a bad pair
safe, where dropping one half makes the pair go away.

## Consequences

A new DTO field that ends in `Label`, or holds a unit, a separator or a rounding, is a design error
and should be a figure instead. A client that needs text derives it from the figure, with a shared
helper where one exists.

`Playtime` no longer formats. It holds minutes and validates them, which is what a boundary object
is for; the rendering rule left it for a free function that any process can call without also
inheriting a constructor that throws.
