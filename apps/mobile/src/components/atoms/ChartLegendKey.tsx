import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../theme/tokens";

type Props = {
  readonly label: string;
  /** A filled bar, the current year's outlined bar, or the running-total line. */
  readonly swatch: "bar" | "outlined" | "line";
};

/** One entry of a chart's legend: what a mark means, in words. */
export function ChartLegendKey({ label, swatch }: Props) {
  return (
    <View style={styles.key}>
      <View style={styles[swatch]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const SWATCH = 8;

const styles = StyleSheet.create({
  key: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  bar: { width: SWATCH, height: SWATCH, borderRadius: 2, backgroundColor: colors.accent },
  outlined: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: 2,
    backgroundColor: colors.accentBorder,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  line: { width: 10, height: 3, borderRadius: 2, backgroundColor: colors.runningTotal },
  label: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted },
});
