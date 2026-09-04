import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../theme/tokens";
import type { UnlockMonth } from "../../view-models/unlock-calendar";

export const UNLOCK_DAY_TEST_ID = "unlock-day";

/** The label column, so every row's days start on the same vertical line. */
const LABEL_WIDTH = 30;
const CELL_RADIUS = 2;
const CELL_GAP = 2;

type Props = { readonly month: UnlockMonth };

/**
 * One month of the unlock calendar: its label, then its days.
 *
 * Every row draws thirty-one columns whatever its month holds, so that a day
 * sits under the same day in every month. A column with no day behind it — the
 * 31st of April, a day not yet lived through — keeps its place and draws
 * nothing. The row decides none of this; it is handed the shape it draws.
 */
export function UnlockMonthRow({ month }: Props) {
  return (
    <View style={styles.row}>
      <Text
        style={{
          ...styles.label,
          color: month.current ? colors.accent : colors.textDim,
        }}
      >
        {month.label}
      </Text>

      <View style={styles.days}>
        {month.days.map((day, index) => (
          <View
            key={index}
            testID={day === null ? undefined : UNLOCK_DAY_TEST_ID}
            style={{
              ...styles.cell,
              backgroundColor:
                day === null
                  ? "transparent"
                  : day.count > 0
                    ? colors.accent
                    : colors.tileEmpty,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 9.5,
    letterSpacing: 0.5,
    width: LABEL_WIDTH,
  },
  days: {
    flex: 1,
    flexDirection: "row",
    gap: CELL_GAP,
  },
  cell: {
    flex: 1,
    // Square, whatever width thirty-one columns leave it on this phone.
    aspectRatio: 1,
    borderRadius: CELL_RADIUS,
  },
});
