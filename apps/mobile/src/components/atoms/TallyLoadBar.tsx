import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

import { useReduceMotion } from "../../accessibility/use-reduce-motion";
import { colors } from "../../theme/tokens";

export const TALLY_LOAD_BAR_TEST_ID = "tally-load-bar";
export const TALLY_LOAD_BAR_FILL_TEST_ID = "tally-load-bar-fill";

/** Thin enough to read as part of the card's border rather than as a figure. */
const THICKNESS = 2;
/** Long enough to read as travel, short enough to keep up with the waves. */
const SLIDE_MS = 400;

type Props = {
  /**
   * The share of a library's tallies that have landed, between 0 and 1, or
   * null when nobody is waiting on any.
   */
  readonly loaded: number | null;
};

/**
 * Says that the figures below it are still growing.
 *
 * A library's tallies land in waves and the card's numbers climb with them,
 * which is pleasant to watch and says nothing about how much is left. This
 * does, and stops existing the moment the answer is "none".
 *
 * It is taken out of the flow on purpose. The card must not appear to change
 * height when the bar goes, and the only way to promise that rather than tune
 * it is to have the bar never lend the card any height in the first place. It
 * lies on the card's own top edge, which clips it to the corner radius.
 *
 * The share is scaled rather than measured: a width cannot be animated by the
 * native driver, a transform can, so the bar keeps up with a wave without
 * costing a bridge crossing per frame. A player who has asked for less motion
 * gets the share without the travel.
 */
export function TallyLoadBar({ loaded }: Props) {
  const reduceMotion = useReduceMotion();
  const slid = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Only once the device has said motion is fine: an unanswered setting is
    // not permission, and the bar still shows the right share without it.
    if (loaded === null || reduceMotion !== false) {
      return;
    }

    const slide = Animated.timing(slid, {
      toValue: loaded,
      duration: SLIDE_MS,
      // Waves arrive unevenly, so the bar should look like it is settling into
      // each one rather than marching at a constant rate.
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    slide.start();
    return () => slide.stop();
  }, [slid, loaded, reduceMotion]);

  if (loaded === null) {
    return null;
  }

  return (
    <Animated.View testID={TALLY_LOAD_BAR_TEST_ID} style={styles.rail}>
      <Animated.View
        testID={TALLY_LOAD_BAR_FILL_TEST_ID}
        style={{
          ...styles.fill,
          transform: [{ scaleX: reduceMotion === true ? loaded : slid }],
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: THICKNESS,
    backgroundColor: colors.track,
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.accent,
    // Without this the bar would grow from its middle outwards, which reads as
    // something opening rather than something filling.
    transformOrigin: "left",
  },
});
