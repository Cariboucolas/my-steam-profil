import {
  cardInView,
  inPageOrder,
  offsetOfCard,
  offsetToShowChip,
  type PageScroll,
} from "./stats-card-scroll";

describe("inPageOrder", () => {
  /**
   * The page fixes where each card goes, not the order they were delivered in:
   * a card built later takes its own place rather than the bottom of the page.
   */
  it("puts the cards in the page's order, whatever order they come in", () => {
    const cards = [{ key: "rarity" }, { key: "week" }, { key: "years" }] as const;

    expect(inPageOrder(cards).map((card) => card.key)).toEqual(["years", "week", "rarity"]);
  });
});

/**
 * A page of three cards under a 60-point title and a 48-point chip row: the
 * years from 108 to 508, the week to 808, a short timeline to 1000. Seen
 * through 500 points, it scrolls 500 at most.
 */
const CARDS = [
  { key: "years", top: 108 },
  { key: "week", top: 508 },
  { key: "timeline", top: 808 },
] as const;
const scrolledTo = (offset: number): PageScroll => ({
  offset,
  viewport: 500,
  content: 1000,
  chipRow: 48,
});

describe("cardInView", () => {
  it("is the first card while none has reached the chip row", () => {
    expect(cardInView(CARDS, scrolledTo(0))).toBe("years");
  });

  /** A card is in view once its top has slid under the chip row stuck to the top. */
  it("is the last card whose top has reached the chip row", () => {
    expect(cardInView(CARDS, scrolledTo(458))).toBe("years");
    expect(cardInView(CARDS, scrolledTo(460))).toBe("week");
  });

  /**
   * The timeline is shorter than the screen: its top never reaches the row,
   * so the end of the page is what says the reader is on it.
   */
  it("is the last card at the end of the page", () => {
    expect(cardInView(CARDS, scrolledTo(498))).toBe("week");
    expect(cardInView(CARDS, scrolledTo(500))).toBe("timeline");
  });

  /** A page not measured yet, or one that fits the screen, has no end to reach. */
  it("claims no end of a page that does not scroll", () => {
    expect(cardInView(CARDS, { offset: 0, viewport: 0, content: 0, chipRow: 0 })).toBe("years");
    expect(cardInView(CARDS, { ...scrolledTo(0), viewport: 1000 })).toBe("years");
  });
});

describe("offsetOfCard", () => {
  it("brings a card's top just under the chip row", () => {
    expect(offsetOfCard(508, scrolledTo(0))).toBe(460);
    expect(offsetOfCard(108, scrolledTo(300))).toBe(60);
  });

  /** A last card shorter than the screen can be brought no further than the end of the page. */
  it("goes no further than the end of the page", () => {
    expect(offsetOfCard(808, scrolledTo(0))).toBe(500);
  });

  it("stays at the top of a page that does not scroll", () => {
    expect(offsetOfCard(508, { ...scrolledTo(0), viewport: 1000 })).toBe(0);
  });
});

/** A row 300 wide, scrolled 100 along, with 20 of room kept at either edge. */
const ROW = { offset: 100, width: 300 } as const;
const MARGIN = 20;

describe("offsetToShowChip", () => {
  it("leaves the row where it is while the chip is on screen", () => {
    expect(offsetToShowChip({ start: 150, width: 60 }, ROW, MARGIN)).toBeUndefined();
  });

  it("brings back a chip hidden past the left edge", () => {
    expect(offsetToShowChip({ start: 90, width: 60 }, ROW, MARGIN)).toBe(70);
  });

  it("brings in a chip hidden past the right edge, its end just inside", () => {
    expect(offsetToShowChip({ start: 380, width: 60 }, ROW, MARGIN)).toBe(160);
  });
});
