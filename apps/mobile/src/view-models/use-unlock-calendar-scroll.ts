import { useRef, useState, type RefObject } from "react";
import type { ScrollView } from "react-native";

import {
  fadedEdges,
  halfInView,
  heightOfMonthsInView,
  offsetOfHalf,
  scrollsThroughTheYear,
  type FadedEdges,
  type YearHalf,
} from "./unlock-calendar-scroll";

/**
 * All this reads of a scroll: how far down the grid has been moved. Narrower
 * than the event the scroll view really sends, so that a test can report a
 * scroll without building one.
 */
export type ScrollReport = {
  readonly nativeEvent: { readonly contentOffset: { readonly y: number } };
};

export type UnlockCalendarScroll = {
  /** Whether there is more year than the card holds, and so anything to scroll. */
  readonly scrolls: boolean;
  /** The grid the reader moves, so that a dot can move it for them. */
  readonly ref: RefObject<ScrollView | null>;
  /**
   * The height the card holds itself to, once it knows one. Undefined until
   * the grid has been measured, and the grid draws at its own full height
   * until then — a card cannot hold a height it has not been told.
   */
  readonly height: number | undefined;
  /** Which half of the year is in view, for the dots to say so. */
  readonly half: YearHalf;
  /** Which edges have more grid beyond them, and so fade. */
  readonly fades: FadedEdges;
  /** What the grid measured, as the scroll view reports it. */
  readonly onContentSizeChange: (width: number, height: number) => void;
  /** Where the reader has moved the grid to. */
  readonly onScroll: (report: ScrollReport) => void;
  /** Moves the grid to a half of the year, as a pressed dot asks it to. */
  readonly goToHalf: (half: YearHalf) => void;
};

/**
 * The reader's place in a calendar taller than its card: what the card holds
 * itself to, which half is in view, which edges have more grid beyond them,
 * and how a dot moves the grid.
 */
export const useUnlockCalendarScroll = (
  monthsDrawn: number,
  rowGap: number,
): UnlockCalendarScroll => {
  const ref = useRef<ScrollView | null>(null);
  // Nought stands for "not measured yet": a grid of no height is not one this
  // could hold to six rows of anything.
  const [content, setContent] = useState(0);
  const [offset, setOffset] = useState(0);

  const height =
    content > 0
      ? heightOfMonthsInView(content, monthsDrawn, rowGap)
      : undefined;

  // What the reader can see is what the card holds itself to; before it has
  // been measured they can see nothing of it, and nothing is claimed.
  const scrolled = { offset, viewport: height ?? 0, content };

  return {
    scrolls: scrollsThroughTheYear(monthsDrawn),
    ref,
    height,
    half: halfInView(scrolled),
    fades: fadedEdges(scrolled),
    onContentSizeChange: (_width, measured) => setContent(measured),
    onScroll: (report) => setOffset(report.nativeEvent.contentOffset.y),
    // Through the very scroll a finger moves, rather than a state of its own:
    // one place holds where the reader is, and the dot is a second way of
    // asking for the same movement.
    goToHalf: (half) =>
      ref.current?.scrollTo({ y: offsetOfHalf(half, scrolled), animated: true }),
  };
};
