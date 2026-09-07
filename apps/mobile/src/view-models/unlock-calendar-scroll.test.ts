import {
  fadedEdges,
  offsetOfHalf,
  halfInView,
  heightOfMonthsInView,
  scrollsThroughTheYear,
  type ScrolledGrid,
} from "./unlock-calendar-scroll";

/**
 * That same December, held to its six rows: 164 pixels of grid seen 80 at a
 * time, so 84 of it can be scrolled past.
 */
const december = (offset: number): ScrolledGrid => ({
  offset,
  viewport: 80,
  content: 164,
});

/**
 * A December as the card really measures it: twelve rows ten pixels tall with
 * four pixels between them, so the whole of it comes to 12 × 10 + 11 × 4 = 164.
 * Six of those rows, with the five gaps between them, come to 80.
 */
describe("heightOfMonthsInView", () => {
  it("holds six rows of the height the year it was handed took", () => {
    expect(heightOfMonthsInView(164, 12, 4)).toBe(80);
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
    expect(halfInView(december(84))).toBe(1);
  });

  /**
   * July is where a paged scroll behaves worst: the second half holds a single
   * row, and a fourteen-pixel drag is the whole of the movement there is. It
   * still reaches the second half, because nothing here is measured in pages.
   */
  it("reaches the second half of a July that can barely move", () => {
    const july = (offset: number): ScrolledGrid => ({
      offset,
      viewport: 80,
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
    expect(fadedEdges(december(84))).toEqual({ top: true, bottom: false });
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
    expect(offsetOfHalf(1, december(0))).toBe(84);
  });

  /**
   * A July whose second half is one row: there is fourteen pixels of movement
   * to be had, and asking for the second half asks for all of it.
   */
  it("asks for no more movement than a barely-scrolling year has", () => {
    expect(offsetOfHalf(1, { offset: 0, viewport: 80, content: 94 })).toBe(14);
  });
});
