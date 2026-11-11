/** How often a scroll reports where it is: once a frame, for what follows it to keep up. */
export const SCROLL_REPORT_MS = 16;

/**
 * All this reads of a scroll: how far down the view has been moved. Narrower
 * than the event the scroll view really sends, so that a test can report a
 * scroll without building one.
 */
export type ScrollReport = {
  readonly nativeEvent: { readonly contentOffset: { readonly y: number } };
};

/** All this reads of a layout: where a view starts and how tall it is. Narrow for the same reason. */
export type LayoutReport = {
  readonly nativeEvent: { readonly layout: { readonly y: number; readonly height: number } };
};

/** All this reads of a sideways scroll: how far along the view has been moved. */
export type SideScrollReport = {
  readonly nativeEvent: { readonly contentOffset: { readonly x: number } };
};

/** All this reads of a layout along a row: where a view starts and how wide it is. */
export type SideLayoutReport = {
  readonly nativeEvent: { readonly layout: { readonly x: number; readonly width: number } };
};
