import { describe, it, expect } from "vitest";
import { unlockStateFromSteam } from "./unlock-state";

describe("unlockStateFromSteam", () => {
  it("translates an unlocked achievement (achieved=1, unlocktime in seconds)", () => {
    const state = unlockStateFromSteam(1, 1697568656);
    expect(state.unlocked).toBe(true);
    if (state.unlocked) {
      expect(state.at.getTime()).toBe(1697568656 * 1000);
    }
  });

  it("translates a locked achievement (achieved=0, unlocktime=0)", () => {
    expect(unlockStateFromSteam(0, 0)).toEqual({ unlocked: false });
  });

  it("treats as locked when achieved=1 but unlocktime=0 (degenerate case)", () => {
    expect(unlockStateFromSteam(1, 0)).toEqual({ unlocked: false });
  });
});
