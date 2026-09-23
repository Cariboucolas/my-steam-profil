import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { useReduceMotion } from "../../accessibility/use-reduce-motion";
import {
  MARK_STOP_COUNT,
  WORDMARK_DELAY_MS,
  WORDMARK_RISE_MS,
  holdFor,
  stopsShownAt,
  tipIsShownAt,
} from "../../splash/splash-timing";
import { colors, fonts } from "../../theme/tokens";
import { BrandMark } from "../atoms/BrandMark";

/** What the stage says, and the only thing on it a reader hears. */
export const SPLASH_WORDMARK = "Steam Achievements";

/** The mark's size on the stage, from the design. */
const MARK_SIZE = 112;

/** The gap under the mark: a quarter of its height, as the design has it. */
const WORDMARK_GAP = 28;

/** How far the wordmark rises into place. */
const RISE_DISTANCE = 8;

/**
 * How often the stage reads its own clock.
 *
 * Half a stop's interval, so a stop is never drawn more than half a step late.
 * The schedule in `splash-timing` is the authority on when each part lands;
 * this only says how closely the stage follows it.
 */
const TICK_MS = 30;

type Props = {
  /**
   * Whether the work the stage is covering has finished — the fonts, and the
   * device store's answer about which profile to show.
   */
  readonly ready: boolean;
  /**
   * Called once, when the stage has both covered that work and run its course.
   * The caller is expected to stop rendering the stage in response.
   */
  readonly onDone: () => void;
};

/**
 * The branded stage between the native splash and the app.
 *
 * The native splash can only be one image on one colour, so the wordmark and
 * the mark filling itself in belong here, on the first screen the app draws
 * itself. The two share a background, which is what makes the seam between
 * them invisible rather than merely quick.
 *
 * It gives way on two conditions, not one. The work it covers may finish in
 * two hundred milliseconds on a warm start — ending there would cut the mark
 * off part-drawn — so the stage also holds for as long as its own reveal takes.
 * A player who asked their device for less motion gets neither the reveal nor
 * the hold: the mark is drawn whole, and the stage lasts exactly as long as the
 * work behind it.
 */
export function SplashStage({ ready, onDone }: Props) {
  const reduceMotion = useReduceMotion();
  const [elapsed, setElapsed] = useState(0);
  const risen = useRef(new Animated.Value(0)).current;

  /** Set on the way out, so a stage that outlives its cue calls back once. */
  const handedOver = useRef(false);

  const animating = reduceMotion === false;

  useEffect(() => {
    if (!animating) {
      return;
    }

    const tick = setInterval(() => {
      setElapsed((ms) => ms + TICK_MS);
    }, TICK_MS);

    return () => clearInterval(tick);
  }, [animating]);

  useEffect(() => {
    if (!animating) {
      return;
    }

    const rise = Animated.timing(risen, {
      toValue: 1,
      delay: WORDMARK_DELAY_MS,
      duration: WORDMARK_RISE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    rise.start();
    return () => rise.stop();
  }, [animating, risen]);

  useEffect(() => {
    // `undefined` is the device not having answered yet, and is not a cue to
    // go: the stage holds rather than risk moving in front of someone who
    // asked it not to.
    if (reduceMotion === undefined || handedOver.current) {
      return;
    }

    if (ready && elapsed >= holdFor(reduceMotion)) {
      handedOver.current = true;
      onDone();
    }
  }, [ready, elapsed, reduceMotion, onDone]);

  const stops = animating ? stopsShownAt(elapsed) : MARK_STOP_COUNT;
  const tip = animating ? tipIsShownAt(elapsed) : true;

  return (
    <View style={styles.stage}>
      <BrandMark size={MARK_SIZE} stops={stops} tip={tip} />
      <Animated.Text
        style={[
          styles.wordmark,
          animating
            ? {
                opacity: risen,
                transform: [
                  {
                    translateY: risen.interpolate({
                      inputRange: [0, 1],
                      outputRange: [RISE_DISTANCE, 0],
                    }),
                  },
                ],
              }
            : null,
        ]}
      >
        {SPLASH_WORDMARK}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: WORDMARK_GAP,
    backgroundColor: colors.bg,
  },
  wordmark: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 19,
    letterSpacing: -0.5,
    color: colors.text,
  },
});
