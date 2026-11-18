# A template may pass on the scroll it lays out

> Amends [ADR-0022](0022-only-a-page-loads-what-it-shows.md): templates stay layout only, but
> "named `ReactNode` props" was too narrow for a layout whose own scroll the page has to hear.

A template may take, beside its named `ReactNode` props, a list of nodes in an order it lays out
and the handlers its scrolling container reports to: a ref, `onScroll`, `onLayout`,
`onContentSizeChange`, and one `onLayout` per part. It wires them to the container and does
nothing else with them. The types of those props are the template's own, written in React Native's
terms, and it imports nothing from `view-models/`. What a position means — which card is in view,
where to move the page — stays with the page and the hooks it calls.

Decided in #186, for `StatsTemplate`: the chip row follows the card in view, and only the scroll
that the template lays out can say which card that is.

## What it binds

- `src/components/templates/`: a template may take scroll and layout handlers and an ordered list
  of `{ key, node }`, typed by itself, generic over the key; never domain data, never a hook from
  `view-models/`, never a decision about what a position means.
- Everything else ADR-0022 binds is unchanged: only a page loads, and the page owns what the
  scroll means.

## Why

**The scroll belongs to the layout.** The chips need to know where each card sits and how far the
page has moved. Only the `ScrollView` the template draws can report that; a page cannot measure a
layout it does not draw.

**Handlers carry no domain.** A ref and a few callbacks typed by React Native tell the template
nothing about cards, chips or the library. The template still renders in a story with stubbed
handlers, which is what ADR-0022's purity was for.

## Considered options

**Named `ReactNode` slots only, the page drawing the `ScrollView`.** The page would then hold the
layout — sticky header, insets, gutters — and the template would shrink to a frame around one
child. Rejected: it moves layout into the page, which is the confusion ADR-0022 set out to stop.

**The template imports the page's binding type from `view-models/`.** What the first version of `StatsTemplate` did.
Rejected: it ties a layout to one view-model's shape, and a template should not know there is one.
