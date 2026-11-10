/**
 * Every card the stats page will hold, in the order it holds them: years (C),
 * week (B), timeline (E), hours (A), rarity (D), genres (F). The order is the
 * page's, not the order the cards were built in.
 */
export const PAGE_ORDER = ["years", "week", "timeline", "hours", "rarity", "genres"] as const;

export type StatsCardKey = (typeof PAGE_ORDER)[number];

/** The cards the page holds, in the page's order: a card added later takes its own place. */
export const inPageOrder = <T extends { readonly key: StatsCardKey }>(
  cards: readonly T[],
): readonly T[] => [...cards].sort((a, b) => PAGE_ORDER.indexOf(a.key) - PAGE_ORDER.indexOf(b.key));

/** Where a card starts on the page, measured from the top of what scrolls. */
export type PlacedCard = { readonly key: StatsCardKey; readonly top: number };

/**
 * Where the reader is on the page: how far down they have moved it, how much
 * they see at once, how much page there is, and how tall the chip row stuck to
 * the top is.
 */
export type PageScroll = {
  readonly offset: number;
  readonly viewport: number;
  readonly content: number;
  readonly chipRow: number;
};

/**
 * A pixel of slack. Positions are measured, not counted, so a scroll that has
 * reached a card or the end can report a fraction of a pixel short of it.
 */
const SLACK = 1;

/** How far the page can be moved: none at all when it fits the screen or is not measured yet. */
const furthest = ({ viewport, content }: PageScroll): number => Math.max(0, content - viewport);

/**
 * The card in view: the last one whose top has slid under the chip row, or the
 * last card of all once the page is scrolled to its end — a last card shorter
 * than the screen never reaches the row. The first card until then.
 */
export const cardInView = (
  cards: readonly PlacedCard[],
  scroll: PageScroll,
): StatsCardKey | undefined => {
  const end = furthest(scroll);
  if (end > 0 && scroll.offset >= end - SLACK) return cards.at(-1)?.key;

  const reached = cards.filter((card) => card.top - scroll.chipRow <= scroll.offset + SLACK);
  return (reached.at(-1) ?? cards[0])?.key;
};

/**
 * Where to move the page for a card's top to sit just under the chip row — or
 * to the end of the page, for a last card too short to get there.
 */
export const offsetOfCard = (top: number, scroll: PageScroll): number =>
  Math.min(Math.max(0, top - scroll.chipRow), furthest(scroll));

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
