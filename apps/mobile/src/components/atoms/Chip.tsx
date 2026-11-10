import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, radius, spacing } from "../../theme/tokens";

type Props = {
  readonly label: string;
  readonly active: boolean;
  readonly onPress: () => void;
  /** A tab when the chips move between parts of one page, as the stats' do. */
  readonly role?: "button" | "tab";
};

/** A pill-shaped toggle: the sort options, the achievement filters and the stats' cards. */
export function Chip({ label, active, onPress, role = "button" }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
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
