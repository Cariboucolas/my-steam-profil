import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, spacing } from "../../theme/tokens";
import { SCROLL_REPORT_MS } from "../../view-models/scroll-reports";
import type { StatsCardKey } from "../../view-models/stats-card-scroll";
import type { StatsScrollBinding } from "../../view-models/use-stats-scroll";
import { BackButton } from "../atoms/BackButton";

/** Room left under the last card, over the home indicator. */
const BOTTOM_ROOM = 40;
/** Clears the back button, which sits over the title row and, once stuck, the chip row. */
const TITLE_INDENT = 56;
/** The chip row is the second child of the scroll, after the title: kept so when adding one. */
const CHIP_ROW_INDEX = 1;

/** A card of the stats page, and the key the chips know it by. */
export type StatsTemplateCard = { readonly key: StatsCardKey; readonly node: ReactNode };

type Props = {
  readonly title: string;
  readonly onBack: () => void;
  /** The chip row, stuck to the top of the page while it scrolls. */
  readonly chips: ReactNode;
  /** The cards, in page order. */
  readonly cards: readonly StatsTemplateCard[];
  /** Where the page reports its scroll and its parts' places, for the chips to follow. */
  readonly scroll: StatsScrollBinding;
};

/**
 * The stats page's layout: a way back, the title, the chip row stuck to the
 * top, and the cards in one scrolling column. Layout only (ADR-0022): what the
 * scroll means is the page's.
 */
export function StatsTemplate({ title, onBack, chips, cards, scroll }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scroll.ref}
        stickyHeaderIndices={[CHIP_ROW_INDEX]}
        scrollEventThrottle={SCROLL_REPORT_MS}
        onScroll={scroll.onScroll}
        onLayout={scroll.onLayout}
        onContentSizeChange={scroll.onContentSizeChange}
        contentContainerStyle={{ paddingBottom: insets.bottom + BOTTOM_ROOM }}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
        <View style={styles.chips} onLayout={scroll.onChipRowLayout}>
          {chips}
        </View>
        {cards.map(({ key, node }) => (
          <View key={key} onLayout={scroll.onCardLayout(key)}>
            {node}
          </View>
        ))}
      </ScrollView>
      <BackButton onPress={onBack} top={insets.top + spacing.sm} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingLeft: TITLE_INDENT,
    paddingRight: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { fontFamily: fonts.sansSemiBold, fontSize: 20, color: colors.text },
  // Opaque, so the cards scroll under it rather than through it.
  chips: { paddingLeft: TITLE_INDENT - spacing.xl, backgroundColor: colors.bg },
});
