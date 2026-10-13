import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../theme/tokens";
import { Skeleton } from "../atoms/Skeleton";

export const RECORD_FIGURE_SKELETON_TEST_ID = "record-figure-skeleton";

/** A figure under a chart; a record also says when it was set. */
type Figure = { readonly value: string; readonly label: string; readonly when?: string };

type Props = {
  /** Null while the library is still being counted: a figure shown early can move. */
  readonly record: Figure | null;
};

/** One figure under a chart: the value, then what it is — and, for a record, when, on a second line. */
export function RecordFigure({ record }: Props) {
  if (record === null) {
    return (
      <View style={styles.figure} testID={RECORD_FIGURE_SKELETON_TEST_ID}>
        <Skeleton width={44} height={15} />
        <Skeleton width={72} height={28} />
      </View>
    );
  }

  const said = record.when === undefined ? record.label : `${record.label}, ${record.when}`;
  return (
    <View style={styles.figure} accessible accessibilityLabel={`${said}: ${record.value}`}>
      <Text style={styles.value}>{record.value}</Text>
      <Text style={styles.caption}>
        {record.when === undefined ? record.label : `${record.label}\n${record.when}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  figure: { flex: 1, minWidth: 0, gap: spacing.xs },
  value: { fontFamily: fonts.mono, fontSize: 15, color: colors.text },
  caption: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 14, color: colors.textMuted },
});
