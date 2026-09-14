# An exact figure is paid for in its own typography

**Cites [0011](0011-a-figure-shortens-only-when-it-must.md). Amends nothing.**

A figure the app promises to write exactly, in a box that has run out of room, buys that room from
its own typography before it asks the layout around it for a pixel. Only when its typography has
nothing left to sell does the question of shortening the figure arise at all.

Today this binds the calendar's month column. It is written here as a rule because ADR-0011 asked
to be reached for by the next figure to run out of room, and this is the first time that happened
— and the answer was no.

## What ran out of room

`UnlockMonthRow` writes a month and its total in one column, so every row's days start on the same
vertical line. The column held 44 px; at 9.5 pt in IBM Plex Mono with `letterSpacing: 0.5`, eight
characters demand `8 × 5.7 + 7 × 0.5 = 49.1 px`. The column held seven. A player unlocking a
thousand or more in a single month — an achievement hunter with idle games, which is exactly who
looks at this screen — wrapped their own label and pushed their row out of the grid.

## Why not the cascade ADR-0011 offers

ADR-0011 says a figure is written in the most informative form that fits, and names the forms:
in full, then one decimal with a unit, then no decimal. It is the obvious answer here and it is
the wrong one, for a reason that only appears once the budget is counted.

The column's budget is not eight characters but **three**: `DEC` takes three and the separator one,
whatever is left is the total's. In three characters the cascade's middle form is dead — `1.2K` is
four. What remains is `999` then `1K`, which is a threshold wearing a cascade's clothes.

And the band it would govern is the one ADR-0011 singled out as the place the decimal earns its
keep: "One decimal earns its place at the bottom of the range." A month total that overflows is
between 1 000 and about 2 000, where `1K` is out by up to five percent — not the fraction of a
percent that made `123K` honest. Applying the cascade here would be copying a decision without its
reason, which is the one thing ADR-0011 forbids in so many words.

## Why widening was never available

The day cells have floors, measured rather than chosen: four tones cannot be told apart below
about 7 px, and 9 px is the smallest that reads (`prototype/activity-grid-width`, verdict on #29).
Those floors are pinned at two widths, and it is the wider phone that binds:

| | the floor | the widest label it permits |
|---|---|---|
| 375 px | 9 px a cell | 50 px |
| 402 px | 10 px a cell | **46 px** |

Eight characters demanded 49.1 px. There was no price the grid could have paid.

## Where the room came from

Two changes inside the label, neither of them visible as such:

- `letterSpacing` drops from 0.5 to 0. At this size it was buying nothing a reader could name, and
  it was costing 3.5 px across eight characters.
- The separator stops being a space and becomes a 2 px gap between two texts. **In a monospaced
  face a space is a glyph and costs exactly what a digit costs** — 5.7 px at 9.5 pt. Two pixels
  read as the same separation for a third of the price.

```
  before   one run of eight characters   8 × 5.7 + 7 × 0.5          = 49.1 px   in a 44 px column
  after    DEC · gap · 9999 · slack      17.1 + 2 + 22.8 + 2.85     = 44.75 px  and that is the column
```

The grid paid nothing. A day cell is 9.17 px at 375 and 10.04 px at 402 — on the right side of
both floors, as it was before.

## What the column now promises, and what keeps it

Four digits, written out, never shortened and never truncated. `9 999` unlocks in one month is
three hundred and thirty-three a day held for thirty days: the bound is where the figure stops
being one a player could produce, and it is one constant, `TOTAL_GUARANTEED_CHARS`, not a sentence
in a comment.

The width is derived from it rather than written beside it — the same move `HEADLINE_REQUIRED_WIDTH`
makes and for the same reason. This matters more here than the arithmetic does: the column had
carried a comment claiming it held `DEC 1024` for as long as it had been wrong, because nothing in
the codebase could disagree with a comment. Now raising the type, restoring the letter spacing or
lengthening the guarantee widens the column on its own, and it is #29's floors that fail — the
tests that were written to protect a legible day cell, now protecting an exact total as well.

Nothing is truncated at the edge of the promise. `DEC 102…` reads as a number, and a wrong number
believed is a worse failure than a broken row seen: overflow stays visible on purpose.

## What this does not say

It does not retire the cascade. `UnlockHeadline` still shortens, ADR-0011 stands unamended, and a
figure with room for five characters and a decimal is a different problem from one with three.

It does not make typography a standing source of pixels. Letter spacing spent is spent; this
column has 1.25 px between its demand and what the 402 px floor permits, and the next character it
is asked to hold has to come from the grid or from nowhere.

## A note on 0012

ADR-0012 describes this column as 44 px holding `DEC 1024`, and names the four-digit overflow as a
separate defect, filed separately. That is the defect this closes. Its decision survives untouched
— the column still opts out of the system text size with `allowFontScaling={false}` rather than
taking a cap that would round to 1, and for the same reason, the separator being a gap that does
not scale. Only the widths it quotes in passing have moved.
