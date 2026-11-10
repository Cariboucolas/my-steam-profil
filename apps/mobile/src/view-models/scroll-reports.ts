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
