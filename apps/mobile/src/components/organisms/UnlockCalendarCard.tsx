import { StyleSheet, View } from "react-native";

import { spacing } from "../../theme/tokens";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import { UnlockMonthRow } from "../molecules/UnlockMonthRow";

export const UNLOCK_CALENDAR_CARD_TEST_ID = "unlock-calendar-card";

type Props = { readonly calendar: UnlockCalendar };

/**
 * The player's year, one row per month begun, running the full width of the
 * screen: thirty-one day columns have to fit a phone, and an inset card puts
 * the cell at 7.8px, under what four tones need to be told apart.
 *
 * It draws no surface and no border of its own. A band of its own tone read as
 * a seam across the screen and pulled the eye harder than the grid it was
 * holding, so the grid sits straight on the screen's own ground and the months
 * are the only thing to look at.
 */
export function UnlockCalendarCard({ calendar }: Props) {
  return (
    <View testID={UNLOCK_CALENDAR_CARD_TEST_ID} style={styles.card}>
      <View style={styles.grid}>
        {calendar.months.map((month) => (
          <UnlockMonthRow key={month.label} month={month} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xxl,
    paddingVertical: spacing.lg + 2,
  },
  grid: {
    gap: spacing.xs,
  },
});
