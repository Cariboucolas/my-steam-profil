import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing, unlockToneFills } from "../../theme/tokens";
import {
  COLUMNS,
  type UnlockDay,
  type UnlockMonth,
} from "../../view-models/unlock-calendar";

export const UNLOCK_DAY_TEST_ID = "unlock-day";
export const UNLOCK_MONTH_LABEL_TEST_ID = "unlock-month-label";
export const UNLOCK_MONTH_TOTAL_TEST_ID = "unlock-month-total";

/**
 * The label column, so every row's days start on the same vertical line. Wide
 * enough for the longest month a heavy player can write there — `DEC 1024`.
 */
const LABEL_WIDTH = 44;
const CELL_RADIUS = 1;
const CELL_GAP = 1;

/**
 * All the row holds the grid off the screen edge by. The band it sits in
 * spends nothing on a margin, because thirty-one columns leave no width to
 * spend: every pixel taken here comes out of the day cells. The legend under
 * the grid reads it, so that it ends on the same line the rows do.
 */
export const GRID_INSET = spacing.sm;

/**
 * How wide a day ends up on a phone this many pixels across. The cells
 * themselves flex, so this predicts rather than sets — but it predicts from
 * the very constants above, so a wider label or a fatter gutter fails the
 * tests that pin the legible minimum.
 */
export const dayCellWidth = (screenWidth: number): number =>
  (screenWidth - 2 * GRID_INSET - LABEL_WIDTH - (COLUMNS - 1) * CELL_GAP) /
  COLUMNS;

/**
 * What a column is painted: nothing where no day sits behind it, and otherwise
 * the fill its tone names. The row reads the tone off the day it was handed; it
 * never works one out from a count.
 */
const fillFor = (day: UnlockDay | null): string =>
  day === null ? "transparent" : unlockToneFills[day.tone];

type Props = { readonly month: UnlockMonth };

/**
 * One month of the unlock calendar: its label, then its days.
 *
 * Every row draws thirty-one columns whatever its month holds, so that a day
 * sits under the same day in every month. A column with no day behind it — the
 * 31st of April, a day not yet lived through — keeps its place and draws
 * nothing. The row decides none of this; it is handed the shape it draws.
 *
 * The month's total sits inside its label rather than in a column of its own at
 * the end of the row. That column would cost the grid the width the cells need
 * to be told apart, and the total reads just as well on the name it belongs to.
 *
 * Read aloud, the whole row is one stop, and its thirty-one cells are none:
 * grouping them is what turns three hundred and sixty-five stops into twelve,
 * for information the rows already state outright. The sentence it is read by
 * arrives written, as every other label on this card does.
 */
export function UnlockMonthRow({ month }: Props) {
  return (
    <View accessible accessibilityLabel={month.a11yLabel} style={styles.row}>
      <Text
        testID={UNLOCK_MONTH_LABEL_TEST_ID}
        style={{
          ...styles.label,
          color: month.current ? colors.accent : colors.textDim,
        }}
      >
        {month.label}
        <Text testID={UNLOCK_MONTH_TOTAL_TEST_ID} style={styles.total}>
          {` ${month.totalLabel}`}
        </Text>
      </Text>

      <View style={styles.days}>
        {month.days.map((day, index) => (
          <View
            key={index}
            testID={day === null ? undefined : UNLOCK_DAY_TEST_ID}
            style={{
              ...styles.cell,
              backgroundColor: fillFor(day),
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
    paddingHorizontal: GRID_INSET,
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 9.5,
    letterSpacing: 0.5,
    width: LABEL_WIDTH,
  },
  total: {
    color: colors.accent,
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
