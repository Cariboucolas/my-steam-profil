import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../theme/tokens";
import { GRID_INSET } from "./UnlockMonthRow";

export const UNLOCK_HEADER_TEST_ID = "unlock-calendar-header";
export const UNLOCK_HEADER_TOTAL_TEST_ID = "unlock-calendar-total";
export const UNLOCK_HEADER_DELTA_TEST_ID = "unlock-calendar-delta";

/**
 * What the screen calls the card. The concept is an UnlockCalendar and the
 * code says so throughout; this one word is the only place the two diverge,
 * and CONTEXT.md records it.
 */
const TITLE = "Activity";

type Props = {
  readonly total: number;
  readonly frameLabel: string;
  /** Absent where the year before held nothing: nothing is written in its place. */
  readonly deltaLabel: string | null;
};

/**
 * Where the player stands, in two lines: the year's running total under the
 * card's name, and beneath it the extent the grid covers set against all of
 * the year before.
 *
 * Every word of the comparison arrives written. "all of" is what stops a
 * reader taking a finished year against a running one for a like-for-like
 * measure, and a header that assembled the sentence itself would be a second
 * place for those words to go missing.
 *
 * It is held off the screen edge by the same inset the grid rows are, rather
 * than by the margin the cards above it use: the header names the grid under
 * it, and two left edges in one card would read as two cards.
 */
export function UnlockCalendarHeader({ total, frameLabel, deltaLabel }: Props) {
  return (
    <View testID={UNLOCK_HEADER_TEST_ID} style={styles.header}>
      <View style={styles.line}>
        <Text style={styles.title}>{TITLE}</Text>
        <Text testID={UNLOCK_HEADER_TOTAL_TEST_ID} style={styles.total}>
          {total}
        </Text>
      </View>

      <View style={styles.line}>
        <Text style={styles.frame}>{frameLabel}</Text>
        {deltaLabel === null ? null : (
          <Text testID={UNLOCK_HEADER_DELTA_TEST_ID} style={styles.delta}>
            {deltaLabel}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // The inset the rows hold the grid off the edge by, so the card has one
    // left edge from its name down to its legend.
    paddingHorizontal: GRID_INSET,
    paddingBottom: spacing.md,
    gap: 3,
  },
  line: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.text,
  },
  total: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 17,
    color: colors.accent,
  },
  frame: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: colors.textDim,
  },
  delta: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.3,
    color: colors.textMuted,
    // The comparison is the line's second thought, and a long one: it gives
    // way to the frame rather than pushing it off its own edge.
    flexShrink: 1,
    textAlign: "right",
  },
});
