# The tone scale reads a rolling year, the header reads calendar years

The UnlockCalendar draws one calendar year and its header counts one: `82`, against a
LastYearsTotal of `306`. The four tones a cell can take are **not** read over that year. They are
read over the **365 days ending today**, a window that ignores the boundary the rest of the card
is built on.

A reader who notices will think it is a bug. It is not, and this is why.

## The tones measure habits, not quantities

A heatmap cell does not say how much a day held. It says where that day sits among this player's
other days. Two players — one who unlocks three achievements a month, one who unlocks three
hundred — must both see contrast, or the card tells them nothing.

That rules out **fixed thresholds** (`0 / 1-2 / 3-5 / 6+`) immediately. They read well for the
second player and paint the first a flat single tone for a whole year. The scale has to be
relative to the player.

## What relative to *what* costs

Three windows were weighed.

**The displayed year alone.** On 2 January a single unlock is the year's maximum and paints
darkest; a week later the same day is pale. Every tone in the grid repaints on 1 January. This is
the broken case, and it is broken for a month every year.

**The displayed year plus the previous calendar year.** This was the recommendation for most of
the discussion, and it has a real elegance: the scale would read over *exactly* the two data sets
the header compares — one window serving both halves of the card. It survives January, because
the previous year carries the window on its own. But it still steps: on 1 January the window
drops the older of its two years, and half the sample is replaced overnight.

**The 365 days ending today.** Constant width. No discontinuity, ever — not on 1 January, not on
any other day. The window slides by one day per day, so a tone changes only when the player's own
recent behaviour changes, which is the only reason a tone should ever change.

The elegance of the second option is a property of the code. The step on 1 January is something
the player sees. When an internal coherence and a visible defect disagree, the visible defect
wins.

## What makes the mismatch survivable

The legend prints its boundaries. Instead of `less ▢▢▢▢▢ more` it reads `0 · 1-2 · 3-5 · 6-11 ·
12+`, computed from this player's active days inside the rolling window.

This is what pays for the decision. The scale no longer has to be inferable from the picture,
because it is written underneath it. Without the printed boundaries the mismatch would be a
silent trap; with them it is a stated fact, and the numbers are legible at a size the 9-pixel
cells could never carry.

## Consequences

The quartiles are taken over the **active** days in the window — days that hold at least one
unlock. A day holding none is the empty tile, outside the scale entirely. Counting empty days
would spend more than half the tone range on nothing for most players, which is the fixed-
threshold failure arriving by another road.

A cell in January is coloured against a window reaching back into the previous September, and
those days are not on screen. Accepted: the alternative is the January repaint.

The scale is computed **once the library has finished loading**, not on every wave of tallies.
Tallies arrive six at a time in most-recently-played order, so recent months fill first and a
live scale would repaint the whole grid dozens of times during a cold open. The grid fills as
the waves land; the boundaries hold still until the last one has. This is the same rule
`useLibraryTallies` already applies to the list's order with `frozenOrder` — nothing moves under
the reader's eyes unless the reader asked for it.

The window costs nothing to widen. ADR-0006 already brings every `unlocktime` the player has
ever earned down with the tallies, so 365 days, 730, or all of it are the same request.
