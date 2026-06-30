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
  it("compte les débloqués sur le total (complétion partielle)", () => {
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

  it("gère une liste vide (0/0, taux 0)", () => {
    const completion = computeGameCompletion([]);
    expect(completion).toMatchObject({ unlocked: 0, total: 0 });
    expect(completion.rate.percentage).toBe(0);
  });

  it("gère un jeu sans aucun déblocage (0/N)", () => {
    const completion = computeGameCompletion([make("a", false), make("b", false)]);
    expect(completion.unlocked).toBe(0);
    expect(completion.total).toBe(2);
    expect(completion.rate.percentage).toBe(0);
  });
});
