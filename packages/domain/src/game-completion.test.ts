import { describe, it, expect } from "vitest";
import { computeGameCompletion } from "./game-completion";
import { type Achievement } from "./achievement";

const make = (apiName: string, unlocked: boolean): Achievement => ({
  apiName,
  displayName: apiName,
  description: "",
  hidden: false,
  icon: "",
  iconGray: "",
  unlockState: unlocked
    ? { unlocked: true, at: new Date(0) }
    : { unlocked: false },
});

describe("computeGameCompletion", () => {
  it("counts unlocked over total (partial completion)", () => {
    const achievements = [
      make("a", true),
      make("b", true),
      make("c", true),
      make("d", false),
      make("e", false),
    ];
    const completion = computeGameCompletion(achievements);
    expect(completion.unlocked).toBe(3);
    expect(completion.total).toBe(5);
    expect(completion.rate.percentage).toBe(60);
  });

  it("handles an empty list (0/0, rate 0)", () => {
    const completion = computeGameCompletion([]);
    expect(completion).toMatchObject({ unlocked: 0, total: 0 });
    expect(completion.rate.percentage).toBe(0);
  });

  it("handles a game with nothing unlocked (0/N)", () => {
    const completion = computeGameCompletion([make("a", false), make("b", false)]);
    expect(completion.unlocked).toBe(0);
    expect(completion.total).toBe(2);
    expect(completion.rate.percentage).toBe(0);
  });
});
