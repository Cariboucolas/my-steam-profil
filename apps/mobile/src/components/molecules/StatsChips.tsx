import { ScrollView, StyleSheet, View } from "react-native";

import { spacing } from "../../theme/tokens";
import { SCROLL_REPORT_MS } from "../../view-models/scroll-reports";
import type { StatsCardKey } from "../../view-models/stats-card-scroll";
import { useChipRowScroll } from "../../view-models/use-chip-row-scroll";
import { Chip } from "../atoms/Chip";

/** A card of the stats page, as its chip names it. */
export type ChipCard = { readonly key: StatsCardKey; readonly label: string };

type Props = {
  /** The cards on the page, in page order. */
  readonly cards: readonly ChipCard[];
  /** The card in view. */
  readonly active: StatsCardKey | undefined;
  readonly onSelect: (key: StatsCardKey) => void;
};

/** One chip per card of the stats page: a tab that brings its card into view. */
export function StatsChips({ cards, active, onSelect }: Props) {
  const scroll = useChipRowScroll(active, spacing.xl);

  return (
    <ScrollView
      ref={scroll.ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      onScroll={scroll.onScroll}
      onLayout={scroll.onLayout}
      scrollEventThrottle={SCROLL_REPORT_MS}
      contentContainerStyle={styles.row}
    >
      {cards.map(({ key, label }) => (
        <View key={key} onLayout={scroll.onChipLayout(key)}>
          <Chip label={label} active={key === active} onPress={() => onSelect(key)} role="tab" />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
});
