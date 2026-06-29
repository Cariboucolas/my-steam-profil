import { describe, it, expect } from "vitest";
import { unlockStateFromSteam } from "./unlock-state";

describe("unlockStateFromSteam", () => {
  it("traduit un succès débloqué (achieved=1, unlocktime en secondes)", () => {
    const state = unlockStateFromSteam(1, 1697568656);
    expect(state.unlocked).toBe(true);
    if (state.unlocked) {
      expect(state.at.getTime()).toBe(1697568656 * 1000);
    }
  });

  it("traduit un succès verrouillé (achieved=0, unlocktime=0)", () => {
    expect(unlockStateFromSteam(0, 0)).toEqual({ unlocked: false });
  });

  it("considère verrouillé si achieved=1 mais unlocktime=0 (cas dégénéré)", () => {
    expect(unlockStateFromSteam(1, 0)).toEqual({ unlocked: false });
  });
});
