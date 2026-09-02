import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../theme/tokens";
import type { TallyByAppId } from "../../view-models/library";
import {
  buildUnlockCalendar,
  CALENDAR_WINDOWS,
  describeDay,
  describeWindow,
  type CalendarWindow,
} from "../../view-models/unlock-calendar";
import { Chip } from "../atoms/Chip";
import { UnlockGrid } from "../molecules/UnlockGrid";

export const UNLOCK_CALENDAR_TEST_ID = "unlock-calendar";
export const UNLOCK_CALENDAR_CONTROLS_TEST_ID = "unlock-calendar-controls";

/** The whole year, because that is the shape of a player's year. */
const OPENS_ON: CalendarWindow = 12;

/** While a load is running the block draws shapes, and writes no figures. */
const NOTHING_TO_SAY_YET = "";

type Props = {
  readonly tallies: TallyByAppId;
  /**
   * The share of the library's tallies that have landed, or null when none are
   * outstanding — the same value the stats card is given. While it is a number
   * the grid keeps filling in, and the counter stays empty: a climbing figure
   * with nothing to say it is provisional is a lie the grid does not tell.
   */
  readonly loaded: number | null;
};

/**
 * When a player has been unlocking, day by day, over three, six or twelve
 * months.
 *
 * The calendar is rebuilt whole whenever the tallies change identity, which is
 * once per wave. Switching duration rebuilds it too, and deliberately keeps the
 * tones it had: the scale is read over twelve months whatever is on screen, so
 * changing duration zooms rather than repaints.
 */
export function UnlockCalendarBlock({ tallies, loaded }: Props) {
  const [window, setWindow] = useState<CalendarWindow>(OPENS_ON);
  const [selectedAt, setSelectedAt] = useState<number | null>(null);

  const calendar = useMemo(
    () => buildUnlockCalendar(tallies, window),
    [tallies, window],
  );

  /**
   * The day is looked up rather than kept, so the one being read goes on
   * climbing with the waves that are still landing — and quietly stops being
   * shown when a shorter duration no longer draws it.
   */
  const selected = useMemo(
    () =>
      selectedAt === null
        ? undefined
        : calendar.weeks.flat().find((day) => day?.at === selectedAt),
    [calendar, selectedAt],
  );

  const counter =
    loaded !== null
      ? NOTHING_TO_SAY_YET
      : selected
        ? describeDay(selected)
        : describeWindow(calendar.total, window);

  return (
    <View testID={UNLOCK_CALENDAR_TEST_ID} style={styles.block}>
      <View style={styles.head}>
        <Text style={styles.title}>UNLOCKS PER DAY</Text>
        <Text style={styles.counter} numberOfLines={1}>
          {counter}
        </Text>
      </View>

      {/*
        Space between, with nothing on the left: #30 puts a tab strip there, and
        the chips must be where they will stay before it arrives.
      */}
      <View testID={UNLOCK_CALENDAR_CONTROLS_TEST_ID} style={styles.controls}>
        <View />
        <View style={styles.windows}>
          {CALENDAR_WINDOWS.map((choice) => (
            <Chip
              key={choice}
              label={`${choice}m`}
              active={choice === window}
              onPress={() => setWindow(choice)}
            />
          ))}
        </View>
      </View>

      <UnlockGrid
        weeks={calendar.weeks}
        selectedAt={selectedAt}
        onSelect={(day) => setSelectedAt(day.at)}
      />

      <View style={styles.axis}>
        <Text style={styles.edge}>{calendar.from}</Text>
        <Text style={styles.edge}>{calendar.to}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: spacing.lg,
  },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.textDim,
  },
  counter: {
    flexShrink: 1,
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  windows: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  edge: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textFaint,
  },
});
