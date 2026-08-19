import { StyleSheet, View } from "react-native";

import { colors } from "../../theme/tokens";

export const PROGRESS_FILL_TEST_ID = "progress-bar-fill";

/** Completion at which the mock swaps amber for green. */
const PERFECT = 100;

type Props = {
  /** Completion percentage, or null when it has not been loaded. */
  readonly percentage: number | null;
  readonly height?: number;
};

const clamp = (value: number): number =>
  Math.min(PERFECT, Math.max(0, value));

export function ProgressBar({ percentage, height = 3 }: Props) {
  const filled = percentage === null ? 0 : clamp(percentage);

  return (
    <View style={{ ...styles.track, height, borderRadius: height / 2 }}>
      <View
        testID={PROGRESS_FILL_TEST_ID}
        style={{
          ...styles.fill,
          width: `${filled}%`,
          borderRadius: height / 2,
          backgroundColor:
            filled >= PERFECT ? colors.success : colors.accent,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.track,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
