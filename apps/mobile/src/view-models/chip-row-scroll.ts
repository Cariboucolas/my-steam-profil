/** Where a chip sits along its row, and how wide it is. */
export type ChipSpan = { readonly start: number; readonly width: number };

/** How far along the chip row is scrolled, and how much of it the screen shows. */
export type ChipRowView = { readonly offset: number; readonly width: number };

/**
 * Where to scroll the chip row for a chip to be on screen with `margin` of room
 * beside it, or undefined when it already is: the row moves only when it must.
 */
export const offsetToShowChip = (
  chip: ChipSpan,
  row: ChipRowView,
  margin: number,
): number | undefined => {
  if (chip.start - margin < row.offset) return Math.max(0, chip.start - margin);
  const end = chip.start + chip.width + margin;
  if (end > row.offset + row.width) return end - row.width;
  return undefined;
};
