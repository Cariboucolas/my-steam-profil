import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, spacing } from "../../theme/tokens";
import { BackButton } from "../atoms/BackButton";
import { TallyLoadBar } from "../atoms/TallyLoadBar";

/** Room left under the last card, over the home indicator. */
const BOTTOM_ROOM = 40;
/** Clears the back button, which sits over the title row. */
const TITLE_INDENT = 56;

type Props = {
  readonly title: string;
  /** One count for the whole page, so one bar across its top. */
  readonly loaded: number | null;
  readonly onBack: () => void;
  readonly children: ReactNode;
};

/** The stats page's layout: a way back, the title, and the cards in one scrolling column. */
export function StatsTemplate({ title, loaded, onBack, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + BOTTOM_ROOM,
        }}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {children}
      </ScrollView>
      <BackButton onPress={onBack} top={insets.top + spacing.sm} />
      <View style={[styles.loadBar, { top: insets.top }]}>
        <TallyLoadBar loaded={loaded} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingLeft: TITLE_INDENT,
    paddingRight: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: { fontFamily: fonts.sansSemiBold, fontSize: 20, color: colors.text },
  loadBar: { position: "absolute", left: 0, right: 0, height: 3 },
});
