import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LOCALES, type Locale } from "../../i18n/locale";
import { colors, fonts, radius, spacing } from "../../theme/tokens";

type Props = {
  readonly active: Locale;
  readonly onSelect: (locale: Locale) => void;
};

/**
 * The language switch every screen carries (ADR-0023): each locale named by
 * its own tag, the one in use lit. A tag rather than a word, so a reader who
 * picked the wrong language still finds theirs.
 */
export function LocaleToggle({ active, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("setup.language")}
      style={styles.group}
    >
      {LOCALES.map((locale) => {
        const selected = locale === active;
        return (
          <Pressable
            key={locale}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onSelect(locale)}
            style={{
              ...styles.segment,
              backgroundColor: selected ? colors.accentSoft : "transparent",
            }}
          >
            <Text style={{ ...styles.label, color: selected ? colors.accent : colors.textMuted }}>
              {locale.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
  },
  segment: {
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
