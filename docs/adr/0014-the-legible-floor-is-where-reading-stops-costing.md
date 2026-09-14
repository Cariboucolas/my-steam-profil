# The legible floor is where reading stops costing

**Amends nothing. Replaces the floor [#29](https://github.com/Cariboucolas/my-steam-profil/issues/29) left behind.**

A day cell in the unlock calendar may be as narrow as **6 px painted**, and its gutter no thinner
than **0.5 px**. Both numbers come from an observer on a phone, answering questions that had right
answers. Neither is the width at which the tones become indistinguishable: that is somewhere below
3 px and was never reached.

## What the old floor was

`UnlockMonthRow.test.tsx` pinned nine, citing a prototype branch and a line of its commit message:

> four tones cannot be told apart at 6-7px, and 9px is the smallest that reads

That prototype drew three layouts and reported the painted width of each — 6.1, 9.1, 12.8. Only
two judgements were ever made: 6.1 did not read, 9.1 did. Nobody looked at 7 or 8. The nine was the
narrowest sampled layout that happened to pass, promoted to a threshold.

It was also measured against something the app does not paint. The prototype carried its own tone
ramp — `0.20 / 0.42 / 0.68 / 1` where `unlockToneFills` is `0.25 / 0.5 / 0.75 / accent` — and its
own gutter of 2 px where the grid now uses 0.5. Both differences make its cells harder to read than
the real ones, so its floor was conservative by an unknown amount.

## What replaces it

A measuring screen, `app/measure/floor.tsx` on `test/measure-legible-floor`, importing
`unlockToneFills` and the row's geometry rather than copying either. One trial shows a real
thirty-one-column row with two cells ticked and lettered, carrying **two neighbouring tones of the
ramp** — the only comparisons in it that are hard — and asks which is paler. The row stays in view,
there is no clock, and nothing has to be remembered. Every trial also records what it cost: easy,
effort, or guess.

Twenty trials: five widths — 3, 4, 5, 6, and the 10.23 the phone ships — by the four neighbouring
pairs.

| painted width | correct | trials answered `effort` |
| ------------- | ------- | ------------------------ |
| 3.00          | 4 / 4   | 4                        |
| 4.00          | 4 / 4   | 3                        |
| 5.00          | 4 / 4   | 3                        |
| 6.00          | 4 / 4   | **0**                    |
| 10.23 (ships) | 4 / 4   | 0                        |

Nothing was answered wrongly anywhere. Twenty right answers at one chance in two is not luck. What
changes with width is not whether the tones can be told apart but what telling them apart costs,
and that cost reaches zero at 6.

So the floor is a **comfort threshold**, and the ADR says so rather than dressing it as a limit of
vision. A calendar is read at a glance, next to a legend, by someone who wants a shape rather than
a number; a width that is legible only with effort has already failed at that.

## The gutter

The same run counted the cells in a run of one tone, at the shipped width, with gutters of 0.25,
0.5 and 1 px. Nine trials, nine correct, and the effort scattered without following the gutter —
0.25 counted as easily as 1. The gutter is not a constraint at any width the grid can reach.

0.5 is pinned all the same, because 0.25 is the thinnest that was looked at. The pin marks the edge
of the evidence, not the edge of legibility.

## The three instruments this took

Written down because the first two both produced confident numbers that were wrong, and the way
they were wrong is the reusable part.

**Ordering five tones, with time.** Passed at every width from 6 to 9, twice each. A run in which
nothing fails has found a ceiling, not a floor — it says only that every condition was above the
limit, never where the limit is. This is the same failure as #29's, which also never saw its
candidate fail.

**Ordering five tones, against an 800 ms exposure.** Failed at widths that had passed comfortably
minutes before — including the width the app ships, which the same observer reads every day. A
control that fails proves the instrument is measuring something else: here, how many items can be
held in mind after the row goes away.

**Comparing two tones, row in view.** Controls hold, and the effort gradient locates a threshold.
The lesson is narrow and worth keeping: a legibility task must ask for one comparison, keep what is
compared in view, and record cost as well as correctness. Correct-but-costly was the whole of the
answer here, and pass/fail would have thrown it away — the first run reported gutter 0.5 as `ok`
while the observer said counting there was work.

## What it is worth

One observer, who describes their own eyes as practised. One device — a Xiaomi Mi 12 reporting 392 dp
at 419 ppi — one brightness, one sitting. Effort is self-reported, not timed. A second observer
could move the six, and if one ever disagrees, that is a reason to re-run the screen rather than to
argue.

What it does settle is the direction: nine was too conservative, by more than a third, and every
width the app can serve — 7.88 px at 320 dp, 9.17 at 360, 9.65 at 375 — clears the measured floor
with room to spare. The grid is not what constrains the layout, and the next thing that wants a
pixel should be told to look elsewhere.
