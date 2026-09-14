/**
 * Design tokens lifted from the Claude Design mock (Steam Achievements App,
 * option 1a). Values are copied, not reinvented: when the mock changes, this
 * file is the single place to follow it.
 */

export const colors = {
  /** Page background. */
  bg: "#0b0f14",
  /** Behind the device frame, a shade darker than the page. */
  bgDeep: "#080c10",
  /**
   * The page's own ground with the colour taken out of it: what a gradient
   * laid over the page fades to. The word `transparent` fades through grey on
   * Android, so the fade has to name the ground it is leaving.
   */
  bgClear: "rgba(11,15,20,0)",
  /** Cards and raised rows. */
  surface: "#131a22",
  /** The stats card reads as a soft gradient between these two. */
  surfaceGradientFrom: "#161f29",
  surfaceGradientTo: "#111820",

  text: "#e9eef5",
  /** Secondary copy: metadata, labels. */
  textMuted: "#8593a3",
  /** Tertiary copy: monospace captions, timestamps. */
  textDim: "#6d7a89",
  /** Barely there: locked rows, absent values. */
  textFaint: "#4d5866",

  /** The one accent of the whole design. */
  accent: "#e9a455",
  /** Accent as a fill behind icons and active chips. */
  accentSoft: "rgba(233,164,85,0.14)",
  accentBorder: "rgba(233,164,85,0.28)",
  accentBorderStrong: "rgba(233,164,85,0.35)",

  /** Reserved for a perfect game: 100 % turns the bar green. */
  success: "#8fd18a",

  /** Hairline separators and card outlines. */
  hairline: "rgba(255,255,255,0.07)",
  /** Track behind a progress bar. */
  track: "rgba(255,255,255,0.07)",
  /** Empty tile, for a locked achievement with no icon. */
  tileEmpty: "rgba(255,255,255,0.04)",
} as const;

/**
 * What each of the five appearances an UnlockDay can take is painted, indexed
 * by its tone: first the empty tile a day outside the scale takes, then the one
 * accent at four evenly spaced strengths, palest first.
 *
 * The mock draws the accent at one strength only, so the four are derived from
 * it rather than copied — `colors.accent` is the last of them, and the others
 * are that same hue at a lower opacity over the page's own dark ground. Four
 * 9-pixel cells have to be told apart, which is what sets the spacing.
 */
export const unlockToneFills = [
  colors.tileEmpty,
  "rgba(233,164,85,0.25)",
  "rgba(233,164,85,0.5)",
  "rgba(233,164,85,0.75)",
  colors.accent,
] as const;

/** Cover art placeholder while a game header image loads or fails. */
export const coverPlaceholder = "#1b2430";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
} as const;

export const radius = {
  sm: 6,
  md: 11,
  lg: 16,
  xl: 18,
  pill: 999,
} as const;

/**
 * The narrowest screen the app serves. Less a choice about phones than the
 * consequence of one promise: the library card's headline holds five mono
 * characters at 44 pt, and 375 is where the room for them runs out — it fits
 * there by nothing at all, and 360 leaves it fifteen pixels short.
 *
 * It sits here because two components read it and would otherwise each keep
 * their own answer, which is how the calendar came to have floors that said
 * nothing about what they were floors for. A layout may hold a screen
 * narrower than this — the unlock calendar holds 360 — but none may promise
 * one (#83).
 */
export const NARROWEST_SCREEN = 375;

/**
 * The mock uses IBM Plex Sans for prose and IBM Plex Mono for every number, so
 * figures line up in columns. Font files load in the root layout.
 */
export const fonts = {
  sans: "IBMPlexSans_400Regular",
  sansMedium: "IBMPlexSans_500Medium",
  sansSemiBold: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
  monoSemiBold: "IBMPlexMono_600SemiBold",
} as const;

/**
 * How far one glyph of IBM Plex Mono advances, as a share of the font size:
 * its `hmtx` table gives 600 units on a 1000-unit em, at every weight named
 * above. It sits beside the faces it describes because it is a fact about the
 * files the app loads rather than a decision any one layout made — and a
 * second copy is a copy that would not learn of a change of face.
 */
export const MONO_ADVANCE = 0.6;
