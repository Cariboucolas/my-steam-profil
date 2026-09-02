import { Animated, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../../theme/tokens";

export const SCROLL_RAIL_TEST_ID = "scroll-rail";
export const SCROLL_RAIL_THUMB_TEST_ID = "scroll-rail-thumb";

/** Thin enough to read as a hint rather than as a control. */
const THICKNESS = 3;
/** Short enough to say "there is a lot", long enough to still be a thumb. */
const SHORTEST_THUMB = 28;

type Props = {
  /** How wide what is being scrolled is, and how much of it can be seen. */
  readonly contentWidth: number;
  readonly viewportWidth: number;
  /** How far it has been scrolled, driven by the scroll view itself. */
  readonly scrolled: Animated.Value;
};

/**
 * A scrollbar and nothing else: no track, no arrows, nothing to press.
 *
 * It keeps its height whether or not it has a thumb to draw. What sits under it
 * is a list of several hundred rows, and a rail that appeared and disappeared
 * with the duration would shift that list every time the reader changed it —
 * a whole screen moving to say something about a grid.
 */
export function ScrollRail({ contentWidth, viewportWidth, scrolled }: Props) {
  const hidden = contentWidth - viewportWidth;
  const overflowing = viewportWidth > 0 && hidden > 0;

  const thumbWidth = overflowing
    ? Math.max(SHORTEST_THUMB, (viewportWidth * viewportWidth) / contentWidth)
    : 0;

  return (
    <View testID={SCROLL_RAIL_TEST_ID} style={styles.rail}>
      {overflowing ? (
        <Animated.View
          testID={SCROLL_RAIL_THUMB_TEST_ID}
          style={[
            styles.thumb,
            {
              width: thumbWidth,
              transform: [
                {
                  translateX: scrolled.interpolate({
                    inputRange: [0, hidden],
                    outputRange: [0, viewportWidth - thumbWidth],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    height: THICKNESS,
    marginTop: spacing.md,
  },
  thumb: {
    height: THICKNESS,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
  },
});
