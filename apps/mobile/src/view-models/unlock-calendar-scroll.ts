/**
 * How many month rows the card grows to before it holds its height. Up to six
 * it grows a row a month, and its size is itself honest information about how
 * much year there is: a January card is one row tall. Past six it holds this
 * height and the reader scrolls the rest.
 */
export const MONTHS_IN_VIEW = 6;

/**
 * The height six rows take, read off the height the rows in hand took.
 *
 * Nothing here knows how tall a row is. A day cell is square and flexes to
 * whatever width thirty-one columns leave it on this phone, so a row's height
 * is a measurement rather than a constant — and a six-row height written down
 * as a number would be right on one screen and wrong on every other.
 *
 * Only asked of a year that scrolls, which is a year of more than six months:
 * `monthsDrawn` is never zero, and the gaps are always one fewer than the rows.
 */
export const heightOfMonthsInView = (
  contentHeight: number,
  monthsDrawn: number,
  rowGap: number,
): number => {
  const rowHeight = (contentHeight - (monthsDrawn - 1) * rowGap) / monthsDrawn;

  return MONTHS_IN_VIEW * rowHeight + (MONTHS_IN_VIEW - 1) * rowGap;
};

/**
 * Whether the card has more year than it holds. A year of six months or fewer
 * is drawn whole and never scrolls — which is also what decides whether there
 * is anything for a fade or a dot to say.
 */
export const scrollsThroughTheYear = (monthsDrawn: number): boolean =>
  monthsDrawn > MONTHS_IN_VIEW;

/**
 * Where the reader is in the grid: how far down they have moved it, how much
 * of it they see at once, and how much of it there is. The three figures a
 * scroll reports, and everything the fade and the dots are worked out from.
 */
export type ScrolledGrid = {
  readonly offset: number;
  readonly viewport: number;
  readonly content: number;
};

/** Which half of the year the dots stand for: the first, or the second. */
export type YearHalf = 0 | 1;

/**
 * Which half of the year is in view: the one the middle of what can be seen
 * falls in.
 *
 * Read off the middle rather than off the top, so that it answers to a scroll
 * that stopped anywhere. The scroll is free and never paged — July, where the
 * second half holds a single row, is exactly where paging behaves worst — so
 * the dot has to say which half the reader is mostly looking at, not which
 * page they turned to.
 */
export const halfInView = ({
  offset,
  viewport,
  content,
}: ScrolledGrid): YearHalf => (offset + viewport / 2 > content / 2 ? 1 : 0);

/** Which edges of the grid have more of it beyond them. */
export type FadedEdges = { readonly top: boolean; readonly bottom: boolean };

/**
 * A pixel of slack at either end. Content and viewport are measured, not
 * counted, so an edge the reader has reached can report a fraction of a pixel
 * short of it — and a fade that never quite goes out would be saying there is
 * more year when there is none.
 */
const EDGE_SLACK = 1;

/**
 * The edges to fade: an edge is marked when there is more grid past it. At
 * rest at the top of the year that is the bottom alone; scrolled to December
 * it is the top alone.
 *
 * The fade is what a scrollbar would have been. A grey bar drawn at the edge
 * that no pointer can grab is a control offered and then withheld, so the edge
 * itself is what says there is more, and the dots below are what can be
 * pressed.
 */
export const fadedEdges = ({
  offset,
  viewport,
  content,
}: ScrolledGrid): FadedEdges => ({
  top: offset > EDGE_SLACK,
  bottom: offset + viewport < content - EDGE_SLACK,
});

/**
 * Where the grid has to be moved to for a half of the year to be in view: the
 * top for the first, and the far end of the scroll for the second.
 *
 * The end rather than the seventh row's own offset, because the two are the
 * same thing in a finished year — six rows and their gaps — and in a July they
 * are not: the second half is a single row there, and the whole of the
 * movement available is what shows it.
 */
export const offsetOfHalf = (
  half: YearHalf,
  { viewport, content }: ScrolledGrid,
): number => (half === 0 ? 0 : Math.max(0, content - viewport));
