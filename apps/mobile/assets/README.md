# App assets

What Expo reads, and what each file is made from. Regenerating any of them is
still a manual export — see issue #127.

| Expo reads | Made from | Notes |
| --- | --- | --- |
| `icon.png` | `icon-square.svg` | square and opaque: both OSes apply their own mask |
| `android-icon-foreground.png` | `adaptive-foreground.svg` | keeps the `1.3` scale that fills the adaptive safe zone |
| `android-icon-background.png` | `adaptive-background.svg` | flat `#0b0f14` |
| `android-icon-monochrome.png` | `adaptive-foreground.svg` | a white silhouette, for Android's themed icons |
| `favicon.png` | `icon.svg` | the rounded mark: a browser does not mask it |
| `splash-icon.png` | `splash-mark.svg` | the native splash, at the 132 pt `app.json` places it |

`splash-mark.svg` is `icon.svg` without its rounded plate: the splash plugin
paints `backgroundColor` behind the image, so the plate would be drawn twice.

`png/` holds the sizes a store listing or a web page asks for by hand, which
nothing in the app reads. It has its own [README](png/README.md).

## The mark is drawn twice, on purpose

The artwork here and `src/theme/mark.ts` are the same mark by two routes: these
are exported images, that is the component the splash animates a stop at a time.

They differ in one figure. The SVGs draw the colour ramp in twenty-four steps;
`MARK_STOPS` draws it in twelve, as the design's animated variant does. Rendered
side by side at 132 pt — the size where the native splash hands over to the
component — the two are indistinguishable, so the seam does not show. Anything
that changes the ramp has to change both.
