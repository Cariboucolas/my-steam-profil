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
 * The four tones a day of unlocks climbs through, palest first, over
 * `colors.tileEmpty` for a day with none. Opacity steps of the one accent
 * rather than four hues: the grid has to read as one quantity getting larger.
 */
export const unlockTones = [
  "rgba(233,164,85,0.22)",
  "rgba(233,164,85,0.45)",
  "rgba(233,164,85,0.72)",
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
