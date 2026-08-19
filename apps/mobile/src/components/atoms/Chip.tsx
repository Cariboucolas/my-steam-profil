import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, radius, spacing } from "../../theme/tokens";

type Props = {
  readonly label: string;
  readonly active: boolean;
  readonly onPress: () => void;
};

/** A pill-shaped toggle: the sort options and the achievement filters. */
export function Chip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        ...styles.chip,
        backgroundColor: active ? colors.accentSoft : "transparent",
        borderColor: active ? colors.accentBorderStrong : colors.hairline,
      }}
    >
      <Text
        style={{
          ...styles.label,
          color: active ? colors.accent : colors.textMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
  },
});
