import { MAX_SCALE_LINES, scaleValues } from "./chart-scale";

describe("scaleValues", () => {
  it("steps by a round amount, as many lines as fit under the peak", () => {
    expect(scaleValues(1027)).toEqual([250, 500, 750, 1000]);
    expect(scaleValues(40)).toEqual([10, 20, 30, 40]);
    expect(scaleValues(5)).toEqual([2, 4]);
  });

  it("never draws more lines than it allows", () => {
    for (const peak of [1, 7, 19, 99, 101, 499, 501, 999, 4954, 123456]) {
      expect(scaleValues(peak).length).toBeLessThanOrEqual(MAX_SCALE_LINES);
      expect(scaleValues(peak).length).toBeGreaterThan(0);
    }
  });

  it("only steps by one, two, two and a half or five times a power of ten", () => {
    for (const peak of [3, 13, 77, 380, 2600, 71000]) {
      const [step = 0] = scaleValues(peak);
      const mantissa = step / 10 ** Math.floor(Math.log10(step));
      expect([1, 2, 2.5, 5]).toContain(mantissa);
    }
  });

  it("never steps below one unlock", () => {
    expect(scaleValues(1)).toEqual([1]);
    expect(scaleValues(2)).toEqual([1, 2]);
  });

  it("has no line to draw under nothing", () => {
    expect(scaleValues(0)).toEqual([]);
  });
});
