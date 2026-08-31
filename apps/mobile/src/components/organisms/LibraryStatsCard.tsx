import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import type { LibrarySummary } from "../../view-models/library";
import { colors, fonts, radius, spacing } from "../../theme/tokens";
import { CompletionRing } from "../atoms/CompletionRing";
import { TallyLoadBar } from "../atoms/TallyLoadBar";
import { StatBlock } from "../atoms/StatBlock";

export const LIBRARY_STATS_CARD_TEST_ID = "library-stats-card";

const RING_SIZE = 78;
const RING_STROKE = 6;

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
          <View style={styles.headline}>
            <Text style={styles.big}>{summary.unlocked.toLocaleString("en-US").replace(/,/g, " ")}</Text>
            <Text style={styles.caption}>{"achievements\nunlocked"}</Text>
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
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
    padding: spacing.lg + 2,
    paddingHorizontal: spacing.xl,
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
    gap: 18,
  },
  figures: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  big: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 44,
    lineHeight: 46,
    color: colors.accent,
    letterSpacing: -2,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 12,
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
