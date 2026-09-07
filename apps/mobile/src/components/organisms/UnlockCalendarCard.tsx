import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import { UnlockMonthRow } from "../molecules/UnlockMonthRow";

export const UNLOCK_CALENDAR_CARD_TEST_ID = "unlock-calendar-card";

type Props = { readonly calendar: UnlockCalendar };

/**
 * The player's year, one row per month begun. On the same surface as the stats
 * card above it, so it reads as part of the library rather than as a widget
 * dropped into it — but running the full width of the screen rather than inset
 * like that card, because thirty-one day columns have to fit a phone and an
 * inset one puts the cell at 7.8px, under what four tones need to be told
 * apart. Hairlines top and bottom stand in for the border a card would have.
 */
export function UnlockCalendarCard({ calendar }: Props) {
  return (
    <LinearGradient
      colors={[colors.surfaceGradientFrom, colors.surfaceGradientTo]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      testID={UNLOCK_CALENDAR_CARD_TEST_ID}
      style={styles.card}
    >
      <View style={styles.grid}>
        {calendar.months.map((month) => (
          <UnlockMonthRow key={month.label} month={month} />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xxl,
    paddingVertical: spacing.lg + 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
  },
  grid: {
    gap: spacing.xs,
  },
});
