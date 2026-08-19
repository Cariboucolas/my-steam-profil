import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../theme/tokens";

type Props = {
  readonly labels: readonly string[];
  readonly activeIndex: number;
  readonly onSelect: (index: number) => void;
};

/**
 * An underlined tab strip. The mock draws the underline with an inset
 * box-shadow; React Native has no such thing, so it is a real border.
 */
export function Tabs({ labels, activeIndex, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {labels.map((label, index) => {
        const active = index === activeIndex;
        return (
          <Pressable
            key={label}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              ...styles.tab,
              borderBottomColor: active ? colors.accent : "transparent",
            }}
          >
            <Text
              style={{
                ...styles.label,
                color: active ? colors.text : colors.textDim,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  tab: {
    paddingBottom: spacing.md - 1,
    borderBottomWidth: 2,
    marginBottom: -1,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
  },
});
