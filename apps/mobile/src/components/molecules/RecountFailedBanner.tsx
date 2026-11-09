import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../../theme/tokens";

type Props = {
  /** Whether the last Recount could not load the list of Games. */
  readonly failed: boolean;
};

/**
 * Says a Recount could not load the list of Games (#164), above a library that
 * stays as it was shown. Discreet on purpose: what the player had is still
 * there and still true, so this is a line, never the full error screen or a
 * modal. Pulling again is the retry, so that is what it offers.
 */
export function RecountFailedBanner({ failed }: Props) {
  const { t } = useTranslation();

  if (!failed) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{t("library.recountFailed")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
  },
});
