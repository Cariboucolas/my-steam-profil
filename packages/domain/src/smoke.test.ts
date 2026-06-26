import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs vitest with strict TypeScript", () => {
    const value: number = 1 + 1;
    expect(value).toBe(2);
  });
});
