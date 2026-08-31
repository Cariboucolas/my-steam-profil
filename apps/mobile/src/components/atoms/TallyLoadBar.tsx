import { StyleSheet, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";

export const TALLY_LOAD_BAR_TEST_ID = "tally-load-bar";
export const TALLY_LOAD_BAR_FILL_TEST_ID = "tally-load-bar-fill";

/** Thin enough to read as a rule rather than as a figure of its own. */
const THICKNESS = 2;
/** Clear of the card's top edge, inside the padding the card already has. */
const FROM_TOP = spacing.sm;

type Props = {
  /**
   * The share of a library's tallies that have landed, between 0 and 1, or
   * null when nobody is waiting on any.
   */
  readonly loaded: number | null;
};

/**
 * Says that the figures above it are still growing.
 *
 * A library's tallies land in waves and the card's numbers climb with them,
 * which is pleasant to watch and says nothing about how much is left. This
 * does, and stops existing the moment the answer is "none".
 *
 * It is taken out of the flow on purpose. The card must not appear to change
 * height when the bar goes, and the only way to promise that rather than tune
 * it is to have the bar never lend the card any height in the first place: it
 * floats in the padding the card already keeps above its content.
 */
export function TallyLoadBar({ loaded }: Props) {
  if (loaded === null) {
    return null;
  }

  return (
    <View testID={TALLY_LOAD_BAR_TEST_ID} style={styles.rail}>
      <View
        testID={TALLY_LOAD_BAR_FILL_TEST_ID}
        style={{ ...styles.fill, width: `${loaded * 100}%` }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    top: FROM_TOP,
    // Held to the same margin as the figures, so it reads as part of the card
    // rather than as a lid on it, and never meets the rounded corners.
    left: spacing.xl,
    right: spacing.xl,
    height: THICKNESS,
    borderRadius: THICKNESS / 2,
    backgroundColor: colors.track,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: THICKNESS / 2,
    backgroundColor: colors.accent,
  },
});
