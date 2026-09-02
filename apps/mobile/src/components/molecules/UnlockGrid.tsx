import { useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { colors, radius, spacing, unlockTones } from "../../theme/tokens";
import {
  describeDay,
  NO_TONE,
  type UnlockDay,
  type UnlockWeek,
} from "../../view-models/unlock-calendar";
import { ScrollRail } from "../atoms/ScrollRail";

export const UNLOCK_GRID_TEST_ID = "unlock-grid";

/** A day. Small enough that a year of them is worth scrolling through. */
const CELL = 11;
const GAP = 3;

type Props = {
  readonly weeks: readonly UnlockWeek[];
  /** The day the reader is looking at, by its midnight, or null for none. */
  readonly selectedAt: number | null;
  readonly onSelect: (day: UnlockDay) => void;
};

const toneOf = (step: number): string =>
  step === NO_TONE ? colors.tileEmpty : (unlockTones[step - 1] ?? colors.accent);

/**
 * A year of unlocking, a cell to the day: rows are Monday to Sunday, columns
 * are weeks, and the right edge is today.
 *
 * Scrolling is free and starts at that right edge, because the days a player
 * came to look at are the recent ones. What overflows is said by the rail
 * underneath, which keeps its height whether or not anything overflows.
 */
export function UnlockGrid({ weeks, selectedAt, onSelect }: Props) {
  const scroller = useRef<ScrollView>(null);
  const scrolled = useRef(new Animated.Value(0)).current;
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  return (
    <View>
      <Animated.ScrollView
        testID={UNLOCK_GRID_TEST_ID}
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => {
          setContentWidth(width);
          // The right edge is today: that is where a reader starts, whatever
          // duration they have chosen and however much of it is off screen.
          scroller.current?.scrollToEnd({ animated: false });
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrolled } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.weeks}
      >
        {weeks.map((week, column) => (
          <View key={String(column)} style={styles.week}>
            {week.map((day, row) =>
              day === null ? (
                // A day that has not happened yet: it holds its place in the
                // column without being drawn, so the week below it still lines
                // up as a week.
                <View key={String(row)} style={styles.missing} />
              ) : (
                <Pressable
                  key={String(row)}
                  onPress={() => onSelect(day)}
                  accessibilityRole="button"
                  accessibilityLabel={describeDay(day)}
                  accessibilityState={{ selected: day.at === selectedAt }}
                  style={{
                    ...styles.day,
                    backgroundColor: toneOf(day.step),
                    borderColor:
                      day.at === selectedAt ? colors.text : "transparent",
                  }}
                />
              ),
            )}
          </View>
        ))}
      </Animated.ScrollView>

      <ScrollRail
        contentWidth={contentWidth}
        viewportWidth={viewportWidth}
        scrolled={scrolled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  weeks: {
    flexDirection: "row",
    gap: GAP,
    paddingHorizontal: spacing.xl,
  },
  week: {
    gap: GAP,
  },
  day: {
    width: CELL,
    height: CELL,
    borderRadius: radius.sm - 3,
    borderWidth: 1,
  },
  missing: {
    width: CELL,
    height: CELL,
  },
});
