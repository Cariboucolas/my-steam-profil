import {
  fadedEdges,
  offsetOfHalf,
  halfInView,
  heightOfMonthsInView,
  scrollsThroughTheYear,
  type ScrolledGrid,
} from "./unlock-calendar-scroll";
import {
  december,
  DECEMBER_HEIGHT,
  ROW_GAP,
  SCROLLED_PAST,
  SIX_ROWS,
} from "./unlock-calendar-scroll.test-support";

describe("heightOfMonthsInView", () => {
  it("holds six rows of the height the year it was handed took", () => {
    expect(heightOfMonthsInView(DECEMBER_HEIGHT, 12, ROW_GAP)).toBe(SIX_ROWS);
  });
});

describe("scrollsThroughTheYear", () => {
  /**
   * The card grows a row a month and only then starts scrolling, so nothing
   * before July scrolls at all: June draws six rows and is done. No empty
   * space is ever reserved for the months still to come.
   */
  it("scrolls only once the year has outgrown the rows the card holds", () => {
    expect(scrollsThroughTheYear(6)).toBe(false);
    expect(scrollsThroughTheYear(7)).toBe(true);
  });
});

describe("halfInView", () => {
  it("stays on the first half of the year until the middle of it is passed", () => {
    expect(halfInView(december(0))).toBe(0);
    // Four rows down: the reader is looking at February to July, and more of
    // what they can see belongs to the first half than to the second.
    expect(halfInView(december(40))).toBe(0);
  });

  /**
   * The dot answers to where the scroll stopped, and the scroll stops
   * anywhere: the reader who has dragged a little past the middle is told so,
   * without ever having turned a page.
   */
  it("takes the second half part way down rather than at the end of the scroll", () => {
    expect(halfInView(december(43))).toBe(1);
    expect(halfInView(december(SCROLLED_PAST))).toBe(1);
  });

  /**
   * July is where a paged scroll behaves worst: the second half holds a single
   * row, and a fourteen-pixel drag is the whole of the movement there is. It
   * still reaches the second half, because nothing here is measured in pages.
   */
  it("reaches the second half of a July that can barely move", () => {
    const july = (offset: number): ScrolledGrid => ({
      offset,
      viewport: SIX_ROWS,
      content: 94,
    });

    expect(halfInView(july(0))).toBe(0);
    expect(halfInView(july(14))).toBe(1);
  });
});

/**
 * The fade marks an edge with more grid beyond it: the bottom while the reader
 * is at the top of the year, the top once they have scrolled past January. It
 * is the one thing that says the card holds more than it shows.
 */
describe("fadedEdges", () => {
  it("marks only the bottom while the whole first half is in view", () => {
    expect(fadedEdges(december(0))).toEqual({ top: false, bottom: true });
  });

  it("marks only the top once the year has been scrolled to its end", () => {
    expect(fadedEdges(december(SCROLLED_PAST))).toEqual({ top: true, bottom: false });
  });

  it("marks both edges in the middle, where the grid runs off in both directions", () => {
    expect(fadedEdges(december(40))).toEqual({ top: true, bottom: true });
  });
});

describe("offsetOfHalf", () => {
  it("puts the first half at the top of the year", () => {
    expect(offsetOfHalf(0, december(40))).toBe(0);
  });

  /**
   * The far end of the scroll. In a finished year that is the seventh row at
   * the top of the card — six rows and the six gaps above them — so pressing
   * the second dot in December really does land the reader on July.
   */
  it("puts the second half as far down as the grid goes", () => {
    expect(offsetOfHalf(1, december(0))).toBe(SCROLLED_PAST);
  });

  /**
   * A July whose second half is one row: there is fourteen pixels of movement
   * to be had, and asking for the second half asks for all of it.
   */
  it("asks for no more movement than a barely-scrolling year has", () => {
    expect(offsetOfHalf(1, { offset: 0, viewport: SIX_ROWS, content: 94 })).toBe(
      14,
    );
  });
});
