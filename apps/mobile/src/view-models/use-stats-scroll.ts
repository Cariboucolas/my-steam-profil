import { type RefObject, useRef, useState } from "react";
import type { ScrollViewInstance } from "react-native";

import { useReduceMotion } from "../accessibility/use-reduce-motion";
import {
  cardInView,
  offsetOfCard,
  type PageScroll,
  type PlacedCard,
  type StatsCardKey,
} from "./stats-card-scroll";
import type { ScrollReport } from "./use-unlock-calendar-scroll";

/** All this reads of a layout: where a view starts and how tall it is. */
export type LayoutReport = {
  readonly nativeEvent: { readonly layout: { readonly y: number; readonly height: number } };
};

/** What the stats template hands its scroll and its parts, for the page to know where it is. */
export type StatsScrollBinding = {
  readonly ref: RefObject<ScrollViewInstance | null>;
  readonly onScroll: (report: ScrollReport) => void;
  /** How much of the page the screen shows. */
  readonly onLayout: (report: LayoutReport) => void;
  /** How much page there is. */
  readonly onContentSizeChange: (width: number, height: number) => void;
  readonly onChipRowLayout: (report: LayoutReport) => void;
  readonly onCardLayout: (key: StatsCardKey) => (report: LayoutReport) => void;
};

export type StatsScroll = {
  /** The card in view, for its chip to be shown active. */
  readonly active: StatsCardKey | undefined;
  /** Moves the page until a card's top sits just under the chip row. */
  readonly goTo: (key: StatsCardKey) => void;
  readonly binding: StatsScrollBinding;
};

type Measured = PageScroll & { readonly tops: Partial<Record<StatsCardKey, number>> };

const UNMEASURED: Measured = { offset: 0, viewport: 0, content: 0, chipRow: 0, tops: {} };

/**
 * The reader's place on the stats page: which of its cards is in view, and how
 * a chip moves the page to one. `cards` are the page's, in page order.
 *
 * What is measured lives outside React's state: a scroll reports dozens of
 * times a second, and only a change of card is worth drawing the page again.
 */
export const useStatsScroll = (cards: readonly StatsCardKey[]): StatsScroll => {
  const ref = useRef<ScrollViewInstance | null>(null);
  const measured = useRef<Measured>(UNMEASURED);
  const [active, setActive] = useState<StatsCardKey | undefined>(cards[0]);
  const reduceMotion = useReduceMotion();

  const placed = (): readonly PlacedCard[] =>
    cards.flatMap((key) => {
      const top = measured.current.tops[key];
      return top === undefined ? [] : [{ key, top }];
    });

  const update = (change: Partial<Measured>) => {
    measured.current = { ...measured.current, ...change };
    setActive(cardInView(placed(), measured.current) ?? cards[0]);
  };

  return {
    active,
    goTo: (key) => {
      const top = measured.current.tops[key];
      if (top === undefined) return;
      ref.current?.scrollTo({
        y: offsetOfCard(top, measured.current),
        // Unanswered is not yet a yes: the page jumps rather than glides.
        animated: reduceMotion === false,
      });
    },
    binding: {
      ref,
      onScroll: (report) => update({ offset: report.nativeEvent.contentOffset.y }),
      onLayout: (report) => update({ viewport: report.nativeEvent.layout.height }),
      onContentSizeChange: (_width, content) => update({ content }),
      onChipRowLayout: (report) => update({ chipRow: report.nativeEvent.layout.height }),
      onCardLayout: (key) => (report) =>
        update({ tops: { ...measured.current.tops, [key]: report.nativeEvent.layout.y } }),
    },
  };
};
