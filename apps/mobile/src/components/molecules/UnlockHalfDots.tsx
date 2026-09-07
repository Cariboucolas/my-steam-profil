import { Pressable, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../../theme/tokens";
import type { YearHalf } from "../../view-models/unlock-calendar-scroll";

export const UNLOCK_HALF_DOT_TEST_ID = "unlock-half-dot";

const HALVES: readonly YearHalf[] = [0, 1];

/** What each dot answers to, so that it is a named control and not a mark. */
const LABELS = ["First half of the year", "Second half of the year"] as const;

const DOT = 5;

/**
 * What is pressed is the padding around the dot rather than the five pixels
 * of it, with a little more slack beyond: a target a thumb can find.
 */
const TARGET_PADDING = spacing.md;
const TARGET_SLACK = 6;

/**
 * How much of a dot a pointer can actually hit. `hitSlop` is a native
 * courtesy — react-native-web extends nothing beyond the box itself — so on
 * the platform where the pointer is a mouse this box is the whole target.
 * Derived from the very constants that draw it, so that a tighter dot or a
 * thinner padding fails the test that pins the smallest target allowed.
 */
export const HALF_DOT_TARGET = DOT + 2 * TARGET_PADDING;

type Props = {
  readonly inView: YearHalf;
  readonly onSelect: (half: YearHalf) => void;
};

/**
 * Which half of the year is in view, and a way to reach the other one.
 *
 * They are a control, not a decoration. The grey scrollbar this design
 * replaces was drawn at the edge of the grid where no pointer could grab it —
 * something offered and then withheld — so these carry a pointer's cursor, a
 * name, and a target wider than the dot itself, and pressing one really moves
 * the grid.
 *
 * They are drawn only where there is a second half to reach. A card that
 * cannot scroll has no dots at all rather than two greyed-out ones: a control
 * that appears when it becomes true beats one offered for a movement that is
 * not possible.
 */
export function UnlockHalfDots({ inView, onSelect }: Props) {
  return (
    <View style={styles.dots}>
      {HALVES.map((half) => (
        <Pressable
          key={half}
          onPress={() => onSelect(half)}
          accessibilityRole="button"
          accessibilityLabel={LABELS[half]}
          accessibilityState={{ selected: half === inView }}
          hitSlop={TARGET_SLACK}
          style={styles.target}
        >
          <View
            testID={UNLOCK_HALF_DOT_TEST_ID}
            style={{
              ...styles.dot,
              backgroundColor:
                half === inView ? colors.accent : colors.textFaint,
            }}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    justifyContent: "center",
  },
  target: {
    padding: TARGET_PADDING,
    // A pointer is told it can press this, on a platform that has one.
    cursor: "pointer",
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
  },
});
