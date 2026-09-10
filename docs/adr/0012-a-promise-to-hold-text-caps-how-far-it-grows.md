# A promise to hold text caps how far it grows

**Amends [0011](0011-a-figure-shortens-only-when-it-must.md).**

A box that promises to hold its text caps how far that text may grow with the reader's system text
size. The cap is derived from that box's own constraint, never shared between boxes and never
written by hand.

Every other piece of text in the app grows without limit, as the platform intends.

## What ADR-0011 assumed

ADR-0011 has the headline written in the most informative form that fits the room the screen
leaves it, and the room is measured. It measured one variable — the screen's width — and treated
the size the text is painted at as a constant:

```ts
const HEADLINE_FONT_SIZE = 44;
```

React Native scales every `Text` by the device's text size setting unless told otherwise, and
nothing in this app told it otherwise. So `HEADLINE_FONT_SIZE` was true only for a reader who had
never touched that setting, and the promise `UnlockHeadline` makes was conditional on a setting
nobody had written down. The tests never caught it because nothing pinned `fontScale` either.

## Why capping, rather than measuring harder

Feeding the scale into the model and letting the cascade shorten sounds like the same move
ADR-0011 already made, one variable further. It does not work, and the arithmetic says why.

At the narrowest width the app serves the headline has 132 px. Letter spacing is applied as
kerning and does not scale — only the font does — so a figure of `c` characters at multiplier `e`
demands `c · 44 · 0.6 · e + (c − 1) · (−2)`. And the caption beside it is a *measured* text width,
so the room shrinks as the demand grows:

```
room(375, e) = 208 − 76e
```

At `e = 2`, room is 56 px and two characters fit. The cascade's shortest form for a five-figure
count is `45K` — three characters, 154 px. There is no fourth form. Measuring harder does not
save a promise there is no longer any way to keep.

## What the cap is

The most demanding case is not the longest figure but the shortest one the cascade can offer for
the worst band: `123K`, four characters, which is all it has for 100 000–999 999. Everywhere else
it reaches two or three. So the cap is the largest multiplier at which four characters still fit
the narrowest phone:

| `e` | demand | room | |
|---|---|---|---|
| 1.13 | 121.3 | 122.1 | fits |
| 1.14 | 122.4 | 121.4 | does not |

It is derived by search from the same constants the card is laid out and painted with, exactly as
`headlineMaxChars` is. Widen a gap, enlarge the ring or raise the font size and the cap falls on
its own rather than becoming quietly false. It is not a number in the theme: a shared cap would be
the minimum over every constrained box in the app, which is to say roughly 1.0, and it would drag
lower every time a tighter box appeared.

The caption is capped at the same multiplier as the headline it labels. Capping only the headline
would let the room keep shrinking above the cap, so the promise would still fail — just later. And
a caption that kept growing beside a figure that had stopped would be visible.

## The cost, stated plainly

A reader at 200 % text size gets 13 % more headline, not 100 %. That is the price of a figure that
never wraps and is never truncated, and it is a real price paid by the reader who most needs the
figure large. It is bounded: it applies to the headline, its caption, and the calendar's month
column. The fraction beneath, the stat blocks, the game list, every heading and every body line in
the app grow without a ceiling — and the screen reader is given the exact count whatever is drawn
(ADR-0011).

## The calendar's month column

`UnlockMonthRow` draws `DEC 1024` inside a 44 px column so every row's days start on the same
line. At 9.5 pt mono that is 49 px of text before any scaling, and the column can take no growth
at all: `e ≤ 1.03` even at seven characters. It opts out with `allowFontScaling={false}` rather
than taking a cap that would round to 1.

Nothing is lost to a reader who cannot read it: the row is one screen-reader stop carrying
`screenReaderLabel`, which spells the month and its total out in full, and the label itself is
already held out of the traversal.

That it overflows at four digits *before* any scaling is a separate defect, filed separately. This
decision does not fix it and does not depend on it.

## What this does not cover

The completion ring is 72 px of SVG that does not scale, holding text that does: `37%` at 19 pt
and `LIBRARY` at 8.5 pt. Both fit under this cap, and they fit *because* of it, not because
anything about the ring was measured. If the cap ever rises, that is the thing to check first.

## The one duplication that cannot be removed

React Native applies `maxFontSizeMultiplier` natively. The width model has to reproduce the same
clamp in JavaScript to predict what will be drawn, so the rule exists twice — once here, once in
Objective-C and its Android counterpart. It cannot be collapsed the way the two halves of the
width model were.

What guards it is a test that the component actually renders the multiplier the model assumes. If
those two ever part company, the model keeps predicting confidently for a size the platform is no
longer painting, which is precisely the failure this ADR exists to end.
