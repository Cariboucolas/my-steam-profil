import { offsetToShowChip } from "./chip-row-scroll";

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
