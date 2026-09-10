import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { formatUnlockHeadline, type LibrarySummary } from "../../view-models/library";
import { colors, fonts, radius, spacing } from "../../theme/tokens";
import { CompletionRing } from "../atoms/CompletionRing";
import { TallyLoadBar } from "../atoms/TallyLoadBar";
import { StatBlock } from "../atoms/StatBlock";

export const LIBRARY_STATS_CARD_TEST_ID = "library-stats-card";

/** How far the card holds itself off each screen edge. */
const CARD_MARGIN = spacing.xl;
/** What it spends inside that on each side, before anything is drawn. */
const CARD_PADDING_HORIZONTAL = spacing.lg;
/** Between the figures column and the ring beside it. */
const TOP_GAP = 14;
/** Between the headline and the caption beside it. */
const HEADLINE_GAP = 9;

const RING_SIZE = 72;
const RING_STROKE = 6;

const CAPTION_FONT_SIZE = 12;

/**
 * The caption's widest line, `achievements`, drawn in IBM Plex Sans 400 at
 * CAPTION_FONT_SIZE: 75.3 px, rounded up. Measured, not guessed — re-measure
 * it in that font at that size if the caption's wording or type ever changes.
 */
const CAPTION_WIDTH = 76;

/**
 * What the headline is painted at. The stylesheet below reads these rather
 * than carrying its own literals, so that the room the headline is measured
 * to need and the room it is given can never drift apart.
 */
const HEADLINE_FONT_SIZE = 44;
const HEADLINE_LETTER_SPACING = -2;

/**
 * How far one glyph advances, as a share of the font size. IBM Plex Mono is
 * monospaced, so this is every glyph at every weight the headline might take:
 * its `hmtx` table gives 600 units on a 1000-unit em.
 */
const MONO_ADVANCE = 0.6;

/** A reader who has left the system text size where it was. */
const UNSCALED = 1;

/**
 * The fewest characters the layout must leave room for at any width the app
 * serves. Not a ceiling: the headline shortens itself to whatever the screen
 * can hold (ADR-0011), so a wide phone draws more than five. It is a floor,
 * and the one place the cascade cannot help — below `10 000` there is no
 * honest shorter form than `9 999`, which is five characters. Give the
 * headline less than this and there is a figure it cannot write at all.
 */
const HEADLINE_GUARANTEED_CHARS = 5;

/**
 * The longest a figure could conceivably be, written out in full: `1 000 000`
 * is nine characters, and a player cannot unlock more than Steam publishes.
 * Only the search below reads it, as the point past which asking is pointless.
 */
const HEADLINE_SEARCH_LIMIT = 9;

const CANDIDATE_LENGTHS = Array.from(
  { length: HEADLINE_SEARCH_LIMIT },
  (_, index) => index + 1,
);

/**
 * The width the layout is asked to keep over what the headline is measured to
 * need. The measurement is a model — rounded metrics, letter spacing credited
 * between glyphs only — so the card clears its demand rather than meeting it.
 * Eight pixels is what the padding, the ring and the two gaps were narrowed to
 * buy, and holding the layout to it is what makes restoring any one of them
 * fail a test rather than quietly eat the margin the model needs.
 */
const HEADLINE_SLACK = 8;

/**
 * How wide the headline is drawn at this many characters, read from the very
 * size and spacing it is painted at, so raising either raises what the layout
 * is asked for. Letter spacing falls between glyphs only: the conservative
 * reading, which never under-counts the width.
 */
const headlineTextWidth = (chars: number, textScale: number): number =>
  chars * HEADLINE_FONT_SIZE * MONO_ADVANCE * textScale +
  (chars - 1) * HEADLINE_LETTER_SPACING;

/**
 * The room the headline has to fit into, model and margin together: what
 * `headlineRoom` must leave behind at every width the app serves, or the
 * cascade in `formatUnlockHeadline` runs out of forms to offer. Read at the
 * unscaled size, because it is the layout's own promise rather than a
 * prediction about any one reader's settings.
 */
export const HEADLINE_REQUIRED_WIDTH =
  headlineTextWidth(HEADLINE_GUARANTEED_CHARS, UNSCALED) + HEADLINE_SLACK;

/**
 * How much width the headline is left on a phone this many pixels across, at
 * this text scale. The headline row flexes, so this predicts rather than sets
 * — but it predicts from the constants the card is laid out with, so widening
 * a gap, restoring the padding or enlarging the ring all show up here.
 *
 * The caption shrinks the room as it grows, because `CAPTION_WIDTH` is a
 * measured width of text and text is what the reader's setting scales. That is
 * why capping the headline alone would not have held the promise (ADR-0012):
 * the room would have gone on shrinking after the demand stopped growing.
 */
export const headlineRoom = (screenWidth: number, textScale: number): number =>
  screenWidth -
  2 * CARD_MARGIN -
  2 * CARD_PADDING_HORIZONTAL -
  TOP_GAP -
  RING_SIZE -
  HEADLINE_GAP -
  CAPTION_WIDTH * textScale;

/**
 * Whether a figure of this many characters fits the room a phone this wide
 * leaves at this text scale. The one place every half of the model meets, so a
 * test can ask the question the card promises an answer to.
 */
export const headlineFits = (
  chars: number,
  screenWidth: number,
  textScale: number,
): boolean =>
  headlineTextWidth(chars, textScale) + HEADLINE_SLACK <=
  headlineRoom(screenWidth, textScale);

/**
 * The shortest form the cascade can offer for the band that gives it least to
 * work with. Between 100 000 and 999 999 all it has is `123K` — four
 * characters, the decimal already given up. Everywhere else it reaches two or
 * three, so this is the case the cap below has to survive.
 */
const HEADLINE_TIGHTEST_CHARS = 4;

/** The narrowest phone the app serves, and so where the cap is decided. */
const NARROWEST_SCREEN = 375;

/**
 * Every multiplier the search below considers, from no growth to double, a
 * hundredth apart. Built by division rather than by accumulating a step, so
 * each one is the same double a literal of the same digits would give.
 */
const SCALE_CANDIDATES = Array.from(
  { length: 101 },
  (_, index) => (100 + index) / 100,
);

/**
 * How far the reader's text size may grow the headline and its caption
 * (ADR-0012). Derived rather than written: the largest multiplier at which the
 * tightest figure still fits the narrowest phone. Widen a gap, enlarge the
 * ring or raise the font size and this falls on its own, instead of staying a
 * number that used to be true.
 *
 * It is not a shared token. A cap every constrained box could live with would
 * be the smallest of them — around 1 — and every tighter box added later would
 * drag the whole app down with it.
 */
export const HEADLINE_MAX_FONT_SCALE =
  SCALE_CANDIDATES.filter((scale) =>
    headlineFits(HEADLINE_TIGHTEST_CHARS, NARROWEST_SCREEN, scale),
  ).at(-1) ?? UNSCALED;

/**
 * What the headline is really painted at, which is the reader's setting until
 * the cap takes over. React Native applies `maxFontSizeMultiplier` natively,
 * so this is the same clamp written a second time — the one duplication the
 * model cannot absorb. What guards it is the test that the component renders
 * the multiplier this assumes.
 */
export const effectiveTextScale = (fontScale: number): number =>
  Math.min(fontScale, HEADLINE_MAX_FONT_SCALE);

/**
 * How long a figure this phone can hold, which is the budget the headline is
 * written to (ADR-0011). Found by asking `headlineFits` rather than by
 * inverting its arithmetic by hand: the demand grows with every character, so
 * counting the lengths that fit gives the longest one, and there is no second
 * formula to drift from the first when a gap or a font size moves.
 */
export const headlineMaxChars = (screenWidth: number, textScale: number): number =>
  CANDIDATE_LENGTHS.filter((chars) => headlineFits(chars, screenWidth, textScale))
    .length;

type Props = {
  readonly summary: LibrarySummary;
  readonly gameCount: number;
  /**
   * How far the library's tallies have got, or null when none are outstanding.
   * The figures above are built from what has landed so far, so while this is
   * a number they are still growing.
   */
  readonly loaded: number | null;
};

export function LibraryStatsCard({ summary, gameCount, loaded }: Props) {
  const rate = summary.total === 0 ? null : Number.parseInt(summary.rateLabel, 10);

  /**
   * Read rather than measured: the width is known before the card is painted,
   * so the headline is never drawn in a form it has to abandon a frame later.
   * A rotation or a split-screen resize re-renders and the figure may change
   * form, which is the honest consequence of fitting it to the screen.
   */
  const { width, fontScale } = useWindowDimensions();
  const textScale = effectiveTextScale(fontScale);
  const headline = formatUnlockHeadline(
    summary.unlocked,
    headlineMaxChars(width, textScale),
  );

  return (
    <LinearGradient
      colors={[colors.surfaceGradientFrom, colors.surfaceGradientTo]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      testID={LIBRARY_STATS_CARD_TEST_ID}
      style={styles.card}
    >
      <TallyLoadBar loaded={loaded} />

      <View style={styles.top}>
        <View style={styles.figures}>
          <View
            style={styles.headline}
            accessible
            accessibilityLabel={summary.unlockedScreenReaderLabel}
          >
            <Text style={styles.big} maxFontSizeMultiplier={HEADLINE_MAX_FONT_SCALE}>
              {headline}
            </Text>
            <Text
              style={styles.caption}
              maxFontSizeMultiplier={HEADLINE_MAX_FONT_SCALE}
            >
              {"achievements\nunlocked"}
            </Text>
          </View>
          <Text style={styles.fraction}>{summary.fraction}</Text>
        </View>

        <CompletionRing size={RING_SIZE} strokeWidth={RING_STROKE} percentage={rate}>
          <Text style={styles.ringRate}>{summary.rateLabel}</Text>
          <Text style={styles.ringLabel}>LIBRARY</Text>
        </CompletionRing>
      </View>

      <View style={styles.stats}>
        <StatBlock value={String(summary.perfectGames)} label="perfect games" />
        <StatBlock value={summary.playtimeLabel} label="played" />
        <StatBlock value={String(gameCount)} label="games owned" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: CARD_MARGIN,
    marginBottom: spacing.xxl,
    padding: spacing.lg + 2,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    // The load bar lies on the top edge, so the corners have to cut it rather
    // than let it run straight across them.
    overflow: "hidden",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: TOP_GAP,
  },
  figures: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: HEADLINE_GAP,
  },
  big: {
    fontFamily: fonts.monoSemiBold,
    fontSize: HEADLINE_FONT_SIZE,
    lineHeight: 46,
    color: colors.accent,
    letterSpacing: HEADLINE_LETTER_SPACING,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: CAPTION_FONT_SIZE,
    lineHeight: 15,
    color: colors.textMuted,
    paddingBottom: 7,
  },
  fraction: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textDim,
    marginTop: spacing.md,
  },
  ringRate: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 19,
    color: colors.accent,
  },
  ringLabel: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    color: colors.textDim,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.xxl,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
});
