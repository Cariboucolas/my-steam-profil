# A figure shortens only when it must

A figure the app draws is written in the most informative form that fits the room the screen
leaves it. Nothing shortens on a threshold, because a threshold is a guess about width; the app
measures the width instead and writes as much of the number as that width can carry.

Today this binds one figure: `UnlockHeadline`, the library card's count of a player's unlocks. It
is written here as a rule rather than as a special case because the next figure to run out of room
will face the same choice, and the reasoning is the part worth keeping.

## What it means concretely

The headline offers three forms of the same number, most informative first, and draws the first
one that fits:

| | form | `45 500` | `123 400` |
|---|---|---|---|
| A | in full, grouped | `45 500` | `123 400` |
| B | one decimal, with a unit | `45.5K` | `123.4K` |
| C | no decimal, with a unit | `45K` | `123K` |

So the same player sees `45.5K` on a 375 px phone and `45 500` on a 430 px one. The figure's form
is a property of the screen, not of the number.

## Why not a threshold

The obvious design — "past `9 999`, write it short" — is a width decision made once, in the dark,
for every device. It is wrong in both directions at once: it shortens `45 500` on a tablet that
had room for it, and it would still overflow at `123.4K` on a small phone, which is six characters
and does not fit either. A single threshold cannot be right for two widths, and the app serves
many.

Measuring costs one call to a width model the card already owns. Issue #43 built that model:
`headlineRoom(width)` says how much room the layout leaves, `headlineTextWidth(chars)` says how
much a figure of a given length demands, and both read the very constants the card is laid out and
painted with. Asking it "how many characters fit here" is the same question it already answers,
inverted — and it is answered by searching with `headlineTextWidth`, never by a second formula
inverted by hand, so the two can never drift.

## Why three forms and not two

One decimal earns its place at the bottom of the range: `10.2K` against `10K` is a nine percent
difference in what the reader is told. It stops earning it at the top, where `123K` is already
accurate to a fraction of a percent — and where the decimal form costs a sixth character that a
narrow phone has never had. A cascade gets both without a rule about which is which: it keeps the
decimal wherever the decimal fits.

## The floor

Below `10 000` the cascade has nothing shorter to offer. `9 999` is five characters and there is no
honest fourth form. The layout must therefore keep room for five characters at the narrowest width
the app serves, or the cascade stops being total — and that is exactly what `HEADLINE_REQUIRED_WIDTH`
and its test have asserted since #43. They survive this decision with their meaning inverted: not
the most the headline may need, but the least the layout must always leave.

## What this does not say

It does not say every figure in the app shortens. `perfectGames`, `gameCount` and the playtime
label are drawn at 12 pt with room to spare; applying this rule to them would be copying a decision
without its reason. When one of them runs out of room, this ADR is the argument to reach for — not
a precedent already binding it.

It does not touch the units or the separators. `K` and `M` are not translated and take no space
before them; the decimal mark follows the language the app displays, never the device's — ADR-0010
governs that and is unchanged here.

It also does not make the figure's form stable within a session. A rotation or a split-screen
resize re-renders the card, and the figure may change form under the reader. That is the honest
consequence of measuring: a figure held to the form it had on a narrower screen would be shortened
for no reason.

## A correction to earlier prose

Several comments, and ADR-0010 itself, describe the thousands separator as a thin space. It is
`U+0020`, a plain space, in every place the code writes one. That is not a defect to fix: the width
model rests on IBM Plex Mono advancing every glyph by 0.6 em, which holds for `U+0020` and need not
hold for `U+2009` — a font that does not define it substitutes a glyph of some other width, and the
measurement silently stops being true. The separator stays `U+0020`; it is the prose that was
wrong.

## Consequences

A component that draws a figure under a width constraint passes that constraint to the formatter,
as a character count, and the formatter chooses the form. The decision about how a number is
written stays in the view model with the other formatters; the decision about how much room there
is stays in the component, beside the layout constants it is derived from. Neither knows the
other's business.

Testing follows the same split. The formatter is tested as a pure function of a value and a budget.
The promise itself — that whatever is drawn fits — is tested as a property across every width the
app serves and the whole range of counts a player can reach, which is the only form of the test
that could have caught the six-character case above.
