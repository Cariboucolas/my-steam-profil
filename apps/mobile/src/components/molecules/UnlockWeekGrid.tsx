import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, unlockToneFills } from "../../theme/tokens";
import type { UnlockToneBand } from "../../view-models/tone-scale";
import type { UnlockWeekRow } from "../../view-models/unlock-week";
import { UnlockToneLegend } from "./UnlockToneLegend";

export const UNLOCK_WEEK_CELL_TEST_ID = "unlock-week-cell";

/** Room for a day's letter, left of its row; the hour bars start after the same room. */
export const WEEK_GUTTER = 16;
export const WEEK_CELL_GAP = 2;

type Props = {
  readonly rows: readonly UnlockWeekRow[];
  readonly legend: readonly UnlockToneBand[];
};

/**
 * The typical week: a row per day, a square per hour, each in its tone, and
 * the scale written under them. Read as one picture with the hour bars, which
 * is why it says nothing to a screen reader on its own.
 */
export function UnlockWeekGrid({ rows, legend }: Props) {
  return (
    <View>
      {rows.map((row) => (
        <View key={row.day} style={styles.row}>
          <Text style={styles.letter}>{row.label}</Text>
          {row.cells.map((tone, hour) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: a day's hours never reorder: the index is the hour.
              key={hour}
              testID={UNLOCK_WEEK_CELL_TEST_ID}
              style={[styles.cell, { backgroundColor: unlockToneFills[tone] }]}
            />
          ))}
        </View>
      ))}
      <UnlockToneLegend legend={legend} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: WEEK_CELL_GAP,
    marginBottom: WEEK_CELL_GAP,
  },
  letter: {
    width: WEEK_GUTTER,
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textDim,
  },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 1.5 },
});
