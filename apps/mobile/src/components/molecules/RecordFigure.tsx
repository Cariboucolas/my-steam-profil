import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../theme/tokens";
import type { YearRecord } from "../../view-models/years-and-cumulative";
import { Skeleton } from "../atoms/Skeleton";

export const RECORD_FIGURE_SKELETON_TEST_ID = "record-figure-skeleton";

type Props = {
  /** Null while the library is still being counted: a record shown early can move. */
  readonly record: YearRecord | null;
};

/** One record under a chart: the figure, then what it is and when, on two lines. */
export function RecordFigure({ record }: Props) {
  if (record === null) {
    return (
      <View style={styles.figure} testID={RECORD_FIGURE_SKELETON_TEST_ID}>
        <Skeleton width={44} height={15} />
        <Skeleton width={72} height={28} />
      </View>
    );
  }

  return (
    <View
      style={styles.figure}
      accessible
      accessibilityLabel={`${record.label}, ${record.when}: ${record.value}`}
    >
      <Text style={styles.value}>{record.value}</Text>
      <Text style={styles.caption}>{`${record.label}\n${record.when}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  figure: { flex: 1, minWidth: 0, gap: spacing.xs },
  value: { fontFamily: fonts.mono, fontSize: 15, color: colors.text },
  caption: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 14, color: colors.textMuted },
});
