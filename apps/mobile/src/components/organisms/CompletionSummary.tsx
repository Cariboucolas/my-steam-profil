import { StyleSheet, Text, View } from "react-native";

import type { GameSummary } from "../../view-models/game-progress";
import { colors, fonts, spacing } from "../../theme/tokens";
import { CompletionRing } from "../atoms/CompletionRing";

const RING = 88;
const STROKE = 7;

type Props = { readonly summary: GameSummary };

export function CompletionSummary({ summary }: Props) {
  return (
    <View style={styles.row}>
      <CompletionRing size={RING} strokeWidth={STROKE} percentage={summary.percentage}>
        <Text style={styles.rate}>{summary.rateLabel}</Text>
      </CompletionRing>

      <View style={styles.text}>
        <Text style={styles.fraction}>{summary.fraction}</Text>
        {summary.remaining !== "" && (
          <Text style={styles.line}>{summary.remaining}</Text>
        )}
        {summary.lastUnlock !== "" && (
          <Text style={styles.line}>{summary.lastUnlock}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: 22,
    paddingBottom: spacing.xl,
  },
  rate: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 22,
    color: colors.accent,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  fraction: {
    fontFamily: fonts.monoMedium,
    fontSize: 17,
    color: colors.text,
    marginBottom: 3,
  },
  line: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
  },
});
