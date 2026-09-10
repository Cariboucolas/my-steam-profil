# The app chooses its language, the device does not

Every string this app shows is written in the language the app has chosen. No wording, no date,
no number separator is taken from the device's locale.

This is already how the code behaves in every place that formats anything. The decision is
recorded here because nothing said it out loud, and a decision that lives only as a habit is one
that gets argued away by the next reasonable-sounding request.

## Where it already applies

- `formatDay` builds `25 Jun 2026` by hand from a month table rather than asking `Intl`.
- The calendar writes its month names out in full, by hand, for the same reason.
- Numbers call `toLocaleString("en-US")` with the locale **written in the call**, then swap the
  comma for a thin space by hand — `3 128 h`.

The third is the interesting one. It reaches for the platform's formatter and then refuses to let
the platform pick the arguments. That is the rule in miniature: the machinery is fine, the
device's opinion is not.

## Why

**The design pins the wording.** The mock writes `3 128 h`, `25 Jun 2026`, `MAR`. Those are
choices, made once, for every reader. A device set to German would render `3.128`, and a thin
space that the design chose deliberately would become a full stop nobody chose.

**Tests must not depend on where they run.** Locale-dependent output makes a suite pass in one
timezone and fail in another. The repo already pins `TZ=UTC` in `formatDay`'s tests for exactly
this; the same argument covers separators.

**A separator is a layout input.** This is the argument that prompted the ADR. Issue #43 showed
that the width of a figure is not a cosmetic property of the figure — it is what decides whether
the library card's headline fits on one line. A string's width depends on the characters in it,
and grouping conventions do not agree on how many characters there are: `3 128`, `3,128` and
`3.128` are three widths in a proportional font, and a convention that groups by four digits, or
does not group at all, changes the count outright. A component that promises to hold five
characters cannot let the device choose the characters.

## What this does not say

It does not say the app stays in English. It will be translated — English first, then French. When
it is, the separator follows **the language the app is displaying**, not the one the device is set
to. A phone configured in German, reading the app in English, sees English conventions throughout.

Nor does it forbid `Intl`. It forbids calling it without saying which locale you mean.

## Considered options

**Follow the device locale.** Rejected on all three grounds above. It is also the option that
sounds most correct in the abstract and is worst here: this app's numbers sit inside a fixed
layout drawn from a mock, and its dates are three-letter columns 44 pixels wide.

**Follow the device locale for numbers only, keeping dates hand-built.** Rejected as the worst of
both: it splits the rule in half, so the next person has to know which half they are in, and it
is precisely the half that feeds layout.

## Consequences

Any new formatting helper takes the app's language as an input or hard-codes the app's choice; it
never reads the device. A component may therefore reason about the width of what it will draw,
which is what makes issue #43's fix testable at all.

The abbreviation of large figures — `45.5K` — inherits this rule before it is built: the decimal
mark follows the app's language, so English writes `45.5K` and French will write `45,5K`, on the
same device.
