# App assets

The SVGs here are the artwork. Every PNG beside them is built from one:

```sh
pnpm icons:build     # rewrite them all
pnpm icons:check     # say whether any has parted company with its artwork
```

`tools/icon-build/src/recipes.ts` is the table of what comes from what, and why.
Three of these look like they could come from `icon.svg` and cannot — the app
icon needs no plate of its own, the splash needs none at all, and the adaptive
foreground is drawn at a larger scale. Each of those has cost somebody an hour,
and each is now a line in that file rather than a thing to remember.

`png/` holds the sizes a store listing or a web page asks for by hand, which
nothing in the app reads. It has its own [README](png/README.md).

## The mark is drawn twice, on purpose

The artwork here and `src/theme/mark.ts` are the same mark by two routes: these
are exported images, that is the component the splash animates a stop at a time.

They differ in one figure. The SVGs draw the colour ramp in twenty-four steps;
`MARK_STOPS` draws it in twelve, as the design's animated variant does. Rendered
side by side at 132 pt — the size where the native splash hands over to the
component — the two are indistinguishable, so the seam does not show.

Everything else about them has to match, and `pnpm icons:check` is what says so:
it reads the ramp's two ends, the tip and the hub off the artwork and compares
them with `mark.ts`. Nothing else in the repository would notice a colour
changed on one side only — it passes every test and appears as a flicker at the
handover.
