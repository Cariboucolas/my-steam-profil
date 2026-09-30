import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../../theme/tokens";

/** Enough room above the form that it does not sit under the status bar. */
const TOP_ROOM = 60;

type Props = {
  /** The form the screen is for. */
  readonly form: ReactNode;
  /** The language switch, where the app can offer one (ADR-0023). */
  readonly languageSwitch?: ReactNode;
};

/**
 * The setup screen's layout: the form, held well clear of the status bar,
 * scrolling out of the keyboard's way (ADR-0022).
 */
export function SetupTemplate({ form, languageSwitch }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + TOP_ROOM,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      // Otherwise the first tap only dismisses the keyboard.
      keyboardShouldPersistTaps="handled"
    >
      {languageSwitch === undefined ? null : (
        <View style={styles.switch}>{languageSwitch}</View>
      )}
      {form}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  switch: {
    alignItems: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
