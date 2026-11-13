import { type RefObject, useEffect, useRef } from "react";
import type { ScrollViewInstance } from "react-native";

import { mayAnimate, useReduceMotion } from "../accessibility/use-reduce-motion";
import { type ChipRowView, type ChipSpan, offsetToShowChip } from "./chip-row-scroll";
import type { SideLayoutReport, SideScrollReport } from "./scroll-reports";

/** What a row of chips hands its scroll and its chips, for the active one to stay on screen. */
export type ChipRowScroll<K extends string> = {
  readonly ref: RefObject<ScrollViewInstance | null>;
  readonly onScroll: (report: SideScrollReport) => void;
  /** How much of the row the screen shows. */
  readonly onLayout: (report: SideLayoutReport) => void;
  readonly onChipLayout: (key: K) => (report: SideLayoutReport) => void;
};

/**
 * Keeps the active chip of a row on screen, with `margin` of room beside it:
 * once the row outgrows the screen, it scrolls sideways when that chip would be
 * off it, and only then.
 *
 * What is measured lives outside React's state: only a change of chip moves the row.
 */
export const useChipRowScroll = <K extends string>(
  active: K | undefined,
  margin: number,
): ChipRowScroll<K> => {
  const ref = useRef<ScrollViewInstance | null>(null);
  const spans = useRef<Partial<Record<K, ChipSpan>>>({});
  const view = useRef<ChipRowView>({ offset: 0, width: 0 });
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    const span = active === undefined ? undefined : spans.current[active];
    if (span === undefined || view.current.width === 0) return;
    const x = offsetToShowChip(span, view.current, margin);
    if (x !== undefined) ref.current?.scrollTo({ x, animated: mayAnimate(reduceMotion) });
  }, [active, margin, reduceMotion]);

  return {
    ref,
    onScroll: (report) => {
      view.current = { ...view.current, offset: report.nativeEvent.contentOffset.x };
    },
    onLayout: (report) => {
      view.current = { ...view.current, width: report.nativeEvent.layout.width };
    },
    onChipLayout: (key) => (report) => {
      const { x, width } = report.nativeEvent.layout;
      spans.current = { ...spans.current, [key]: { start: x, width } };
    },
  };
};
