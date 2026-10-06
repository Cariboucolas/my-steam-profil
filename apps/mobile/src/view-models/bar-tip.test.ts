import { tipLeft } from "./bar-tip";

/** Ten bars of 30 px with 5 px between them: 345 px across. */
const plot = { count: 10, width: 345, gap: 5, tipWidth: 80 };

describe("tipLeft", () => {
  it("centres the tip over its bar", () => {
    // Bar 4 starts at 4 × 35 = 140 and is 30 wide: its centre is 155.
    expect(tipLeft({ ...plot, index: 4 })).toBe(115);
  });

  it("keeps the tip inside the plot's left edge", () => {
    expect(tipLeft({ ...plot, index: 0 })).toBe(0);
  });

  it("keeps the tip inside the plot's right edge", () => {
    expect(tipLeft({ ...plot, index: 9 })).toBe(265);
  });

  it("starts at the left edge of a plot narrower than the tip", () => {
    expect(tipLeft({ count: 1, width: 40, gap: 5, tipWidth: 80, index: 0 })).toBe(0);
  });
});
