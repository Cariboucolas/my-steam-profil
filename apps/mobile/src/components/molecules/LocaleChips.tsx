import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { LOCALES, type Locale } from "../../i18n/locale";
import { colors, fonts, spacing } from "../../theme/tokens";
import { Chip } from "../atoms/Chip";

/**
 * A language is named in itself, never translated: a reader who picked the
 * wrong one must still find their own.
 */
const NAMES: Readonly<Record<Locale, string>> = {
  en: "English",
  fr: "Français",
};

type Props = {
  readonly active: Locale;
  readonly onSelect: (locale: Locale) => void;
};

/** The languages the app is written in, one chip each (ADR-0023). */
export function LocaleChips({ active, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{t("setup.language")}</Text>
      <View style={styles.row}>
        {LOCALES.map((locale) => (
          <Chip
            key={locale}
            label={NAMES[locale]}
            active={locale === active}
            onPress={() => onSelect(locale)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
