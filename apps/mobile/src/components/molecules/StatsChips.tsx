import { useEffect, useRef } from "react";
import {
  type LayoutChangeEvent,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from "react-native";

import { useReduceMotion } from "../../accessibility/use-reduce-motion";
import { spacing } from "../../theme/tokens";
import type { StatsCardKey } from "../../view-models/stats-card-scroll";
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
  const ref = useRef<ScrollViewInstance | null>(null);
  const starts = useRef<Partial<Record<StatsCardKey, number>>>({});
  const reduceMotion = useReduceMotion();

  // The row scrolls sideways once it outgrows the screen: the chip of the card
  // in view is kept on it.
  useEffect(() => {
    const start = active === undefined ? undefined : starts.current[active];
    if (start === undefined) return;
    ref.current?.scrollTo({ x: Math.max(0, start - spacing.xl), animated: reduceMotion === false });
  }, [active, reduceMotion]);

  const measured = (key: StatsCardKey) => (event: LayoutChangeEvent) => {
    starts.current = { ...starts.current, [key]: event.nativeEvent.layout.x };
  };

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={styles.row}
    >
      {cards.map(({ key, label }) => (
        <View key={key} onLayout={measured(key)}>
          <Chip label={label} active={key === active} onPress={() => onSelect(key)} role="tab" />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
});
