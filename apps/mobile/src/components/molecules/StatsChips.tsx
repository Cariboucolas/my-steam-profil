import { useEffect, useRef } from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from "react-native";

import { useReduceMotion } from "../../accessibility/use-reduce-motion";
import { spacing } from "../../theme/tokens";
import {
  type ChipRowView,
  type ChipSpan,
  offsetToShowChip,
  type StatsCardKey,
} from "../../view-models/stats-card-scroll";
import { Chip } from "../atoms/Chip";

/** How often a scroll reports where it is: once a frame. */
const SCROLL_REPORT_MS = 16;

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
  const spans = useRef<Partial<Record<StatsCardKey, ChipSpan>>>({});
  const view = useRef<ChipRowView>({ offset: 0, width: 0 });
  const reduceMotion = useReduceMotion();

  // Once the row outgrows the screen, it scrolls sideways when the chip of the
  // card in view would be off it, and only then.
  useEffect(() => {
    const span = active === undefined ? undefined : spans.current[active];
    if (span === undefined || view.current.width === 0) return;
    const x = offsetToShowChip(span, view.current, spacing.xl);
    // Unanswered is not yet a yes: the row jumps rather than glides.
    if (x !== undefined) ref.current?.scrollTo({ x, animated: reduceMotion === false });
  }, [active, reduceMotion]);

  const measured = (key: StatsCardKey) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    spans.current = { ...spans.current, [key]: { start: x, width } };
  };
  const scrolled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    view.current = { ...view.current, offset: event.nativeEvent.contentOffset.x };
  };
  const laidOut = (event: LayoutChangeEvent) => {
    view.current = { ...view.current, width: event.nativeEvent.layout.width };
  };

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      onScroll={scrolled}
      onLayout={laidOut}
      scrollEventThrottle={SCROLL_REPORT_MS}
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
