import { describe, it, expect } from "vitest";
import { CompletionRate } from "./completion-rate";

describe("CompletionRate", () => {
  it("computes and rounds a percentage (real case 353/483)", () => {
    const rate = CompletionRate.from(353, 483);
    expect(rate.rounded).toBe(73.1);
    expect(rate.format()).toBe("73.1 %");
  });

  it("is 100 for a completed game (500/500)", () => {
    expect(CompletionRate.from(500, 500).percentage).toBe(100);
  });

  it("is 0 when nothing is unlocked (0/64)", () => {
    expect(CompletionRate.from(0, 64).percentage).toBe(0);
  });

  it("is 0 for 0/0 (no division by zero)", () => {
    expect(CompletionRate.from(0, 0).percentage).toBe(0);
  });

  it("rejects unlocked > total", () => {
    expect(() => CompletionRate.from(5, 4)).toThrow(RangeError);
  });

  it("rejects negative values", () => {
    expect(() => CompletionRate.from(-1, 10)).toThrow(RangeError);
  });

  it("rejects non-integer values", () => {
    expect(() => CompletionRate.from(1.5, 10)).toThrow(RangeError);
  });
});
