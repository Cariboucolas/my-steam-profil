import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing, unlockToneFills } from "../../theme/tokens";
import type { UnlockToneBand } from "../../view-models/unlock-calendar";
import { GRID_INSET } from "./UnlockMonthRow";

export const UNLOCK_LEGEND_TEST_ID = "unlock-legend";
export const UNLOCK_LEGEND_SWATCH_TEST_ID = "unlock-legend-swatch";

/** A swatch reads as a day cell without pretending to be one, a shade larger. */
const SWATCH = 8;

type Props = { readonly legend: readonly UnlockToneBand[] };

/**
 * The tone scale written out: every appearance a day can take, beside the
 * counts it stands for.
 *
 * It prints numbers where a heatmap legend customarily prints `less ▢▢▢▢▢
 * more`. The window the tones are read over is not the year the grid draws, so
 * the scale cannot be inferred from the picture and has to be stated — and it
 * is stated here because 9-pixel cells could never carry the figures
 * themselves (ADR-0007).
 *
 * It sits at the end of the grid rather than under the month labels: the labels
 * already hold the left of every row, and a second column of small type beneath
 * them would read as a sixth month.
 */
export function UnlockToneLegend({ legend }: Props) {
  return (
    <View testID={UNLOCK_LEGEND_TEST_ID} style={styles.legend}>
      {legend.map((band) => (
        <View key={band.tone} style={styles.band}>
          <View
            testID={UNLOCK_LEGEND_SWATCH_TEST_ID}
            style={{
              ...styles.swatch,
              backgroundColor: unlockToneFills[band.tone],
            }}
          />
          <Text style={styles.label}>{band.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    // The same inset the rows use, so the legend ends where the grid does.
    paddingHorizontal: GRID_INSET,
    paddingTop: spacing.sm,
  },
  band: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: 1,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.3,
    color: colors.textDim,
  },
});
