# Exported icon sizes

Nothing in the app reads this directory. Expo reads the five PNGs one level up
(`../icon.png`, `../android-icon-foreground.png`, `../android-icon-background.png`,
`../android-icon-monochrome.png`, `../favicon.png`). These are the sizes a store
listing or a web page asks for by hand, kept so they do not have to be
re-exported one at a time.

All of them come from the SVGs one level up. Regenerating them is not yet a
command — see issue #127.

| File | Source | What asks for it |
| --- | --- | --- |
| `play-store-512.png` | `icon-square.svg` | the Google Play listing: square and opaque, Play applies its own mask |
| `icon-512.png` | `icon.svg` | the icon shown as-is, rounded corners included |
| `icon-inverted-512.png` | `icon-inverted.svg` | the flat variant, for a light background |
| `icon-192.png` | `icon.svg` | the web app manifest |
| `icon-180.png` | `icon.svg` | `apple-touch-icon` |
| `icon-64.png`, `icon-48.png`, `icon-32.png`, `icon-16.png` | `icon.svg` | browser favicons |
| `adaptive-foreground-432.png` | `adaptive-foreground.svg` | the Android adaptive layer at its 108dp minimum |
| `adaptive-background-432.png` | `adaptive-background.svg` | the same, for the layer behind it |

Two things are easy to get wrong and are already decided:

- `icon.svg` carries its own `rx="112"`. iOS and Android round the icon
  themselves, so the app icon comes from `icon-square.svg` instead — square,
  opaque, no alpha.
- `adaptive-foreground.svg` is scaled `1.3` on purpose: the mark has to fill the
  adaptive safe zone, where the plain icon would read as too small.
