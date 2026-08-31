import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { useReduceMotion } from "../../accessibility/use-reduce-motion";
import { colors } from "../../theme/tokens";

export const SKELETON_TEST_ID = "skeleton";

/** How faint and how solid the pulse gets at either end of its swing. */
const DIMMEST = 0.35;
const BRIGHTEST = 1;
const HALF_CYCLE_MS = 750;
/**
 * Where the block sits when it may not move: the middle of the swing, so it
 * carries the same weight on the page as the pulse everyone else is watching.
 */
const STILL = (DIMMEST + BRIGHTEST) / 2;

type Props = {
  readonly width: number;
  readonly height: number;
  readonly radius?: number;
};

/**
 * Stands where a value will be while it is being fetched.
 *
 * The library asks for a tally per game and they land in waves, so most rows
 * spend a moment with nothing to show. Drawing them as a dash would be a lie:
 * a dash already means "this game has nothing to earn". The pulse is what
 * separates a row that is waiting from a row that is finished having nothing.
 *
 * React Native's own Animated, driven natively: an opacity swing is one of the
 * properties the native driver handles, so the pulse costs no bridge traffic
 * while several hundred rows are being filled in.
 *
 * A player who has asked their device for less motion gets the block without
 * the swing. The block itself is not negotiable — it is the only thing telling
 * a row that is waiting apart from a Game with nothing to earn.
 */
export function Skeleton({ width, height, radius }: Props) {
  const pulse = useRef(new Animated.Value(DIMMEST)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const swing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: BRIGHTEST,
          duration: HALF_CYCLE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: DIMMEST,
          duration: HALF_CYCLE_MS,
          useNativeDriver: true,
        }),
      ]),
    );
    swing.start();
    return () => swing.stop();
  }, [pulse, reduceMotion]);

  return (
    <Animated.View
      testID={SKELETON_TEST_ID}
      accessibilityLabel="Loading"
      style={{
        ...styles.block,
        width,
        height,
        borderRadius: radius ?? height / 2,
        opacity: reduceMotion ? STILL : pulse,
      }}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.track,
  },
});
