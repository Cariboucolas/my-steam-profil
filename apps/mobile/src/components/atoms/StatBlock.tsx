import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../theme/tokens";

type Props = {
  readonly value: string;
  readonly label: string;
  readonly accent?: boolean;
};

/** One figure and its caption, as used along the bottom of the stats card. */
export function StatBlock({ value, label, accent = false }: Props) {
  return (
    <View style={styles.block}>
      <Text
        style={{
          ...styles.value,
          color: accent ? colors.accent : colors.text,
        }}
      >
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.xs,
  },
  value: {
    fontFamily: fonts.monoMedium,
    fontSize: 15,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textDim,
  },
});
