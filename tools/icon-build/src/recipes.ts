import { fileURLToPath } from "node:url";

/** Where the app keeps its artwork and the images built from it. */
export const ASSETS = fileURLToPath(
  new URL("../../../apps/mobile/assets/", import.meta.url),
);

/** An edit applied to the source before it is rendered. */
export type Edit = "plate" | "monochrome";

export type Recipe = {
  /** Where it is written, relative to `assets/`. */
  readonly out: string;
  /** The artwork it comes from, in `assets/`. */
  readonly from: string;
  /** Rendered square, at this many pixels. */
  readonly size: number;
  /** What the source needs before it is rendered. */
  readonly edits: readonly Edit[];
  /**
   * Whether the result is flattened onto the app's ground and stripped of its
   * alpha channel. A layer meant to sit behind another cannot be see-through;
   * one meant to sit on top cannot be opaque.
   */
  readonly opaque: boolean;
  /** Who asks for it. Every recipe owes an answer, or it is work nobody wanted. */
  readonly reads: string;
};

/** What Expo scales everything down from; it never scales up. */
const STORE = 1024;

/**
 * Every image built from the artwork, and what each one is for.
 *
 * The table is the point of this tool. Three of these look like they could come
 * from `icon.svg` and cannot, and each of those has cost somebody an hour:
 *
 * - the app icon must be **square and opaque**, because both OSes apply their
 *   own mask. `icon.svg` is rounded, so it would be masked twice and arrive
 *   with transparent corners that the App Store refuses.
 * - the splash must have **no plate at all**, because its plugin paints the
 *   background behind the image. `icon.svg`'s plate would be drawn twice, and
 *   read as a rounded card floating on the ground.
 * - the adaptive foreground is drawn at a **larger scale**, which is what makes
 *   the mark fill Android's safe zone rather than sit small inside it.
 */
export const RECIPES: readonly Recipe[] = [
  {
    out: "icon.png",
    from: "icon-square.svg",
    size: STORE,
    edits: [],
    opaque: true,
    reads: "expo.icon — iOS, Android and the stores",
  },
  {
    out: "android-icon-foreground.png",
    from: "adaptive-foreground.svg",
    size: STORE,
    edits: [],
    opaque: false,
    reads: "expo.android.adaptiveIcon.foregroundImage",
  },
  {
    out: "android-icon-background.png",
    from: "adaptive-background.svg",
    size: STORE,
    edits: [],
    opaque: true,
    reads: "expo.android.adaptiveIcon.backgroundImage",
  },
  {
    out: "android-icon-monochrome.png",
    from: "adaptive-foreground.svg",
    size: STORE,
    edits: ["monochrome"],
    opaque: false,
    reads: "expo.android.adaptiveIcon.monochromeImage — Android's themed icons",
  },
  {
    out: "favicon.png",
    from: "icon.svg",
    size: 192,
    edits: [],
    opaque: false,
    reads: "expo.web.favicon — a browser does not mask it, so it keeps its plate",
  },
  {
    out: "splash-icon.png",
    from: "icon.svg",
    size: STORE,
    edits: ["plate"],
    opaque: false,
    reads: "the expo-splash-screen plugin, which paints the ground itself",
  },

  // The hand sizes. Nothing in the app reads these; they exist so a store
  // listing or a web manifest does not send anyone back to a design tool.
  {
    out: "png/play-store-512.png",
    from: "icon-square.svg",
    size: 512,
    edits: [],
    opaque: true,
    reads: "the Google Play listing, which applies its own mask",
  },
  {
    out: "png/icon-512.png",
    from: "icon.svg",
    size: 512,
    edits: [],
    opaque: false,
    reads: "the mark as it is shown, rounded corners included",
  },
  {
    out: "png/icon-inverted-512.png",
    from: "icon-inverted.svg",
    size: 512,
    edits: [],
    opaque: false,
    reads: "the flat variant, for a light background",
  },
  {
    out: "png/icon-192.png",
    from: "icon.svg",
    size: 192,
    edits: [],
    opaque: false,
    reads: "the web app manifest",
  },
  {
    out: "png/icon-180.png",
    from: "icon.svg",
    size: 180,
    edits: [],
    opaque: false,
    reads: "apple-touch-icon",
  },
  {
    out: "png/icon-64.png",
    from: "icon.svg",
    size: 64,
    edits: [],
    opaque: false,
    reads: "a browser favicon",
  },
  {
    out: "png/icon-48.png",
    from: "icon.svg",
    size: 48,
    edits: [],
    opaque: false,
    reads: "a browser favicon",
  },
  {
    out: "png/icon-32.png",
    from: "icon.svg",
    size: 32,
    edits: [],
    opaque: false,
    reads: "a browser favicon",
  },
  {
    out: "png/icon-16.png",
    from: "icon.svg",
    size: 16,
    edits: [],
    opaque: false,
    reads: "a browser favicon",
  },
  {
    out: "png/adaptive-foreground-432.png",
    from: "adaptive-foreground.svg",
    size: 432,
    edits: [],
    opaque: false,
    reads: "the Android adaptive layer at its 108dp minimum",
  },
  {
    out: "png/adaptive-background-432.png",
    from: "adaptive-background.svg",
    size: 432,
    edits: [],
    opaque: true,
    reads: "the layer behind it, at the same minimum",
  },
];
