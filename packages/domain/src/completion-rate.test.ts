import { describe, it, expect } from "vitest";
import { CompletionRate } from "./completion-rate";

describe("CompletionRate", () => {
  it("calcule un pourcentage et l'arrondit (cas réel 353/483)", () => {
    const rate = CompletionRate.from(353, 483);
    expect(rate.rounded).toBe(73.1);
    expect(rate.format()).toBe("73.1 %");
  });

  it("vaut 100 pour un jeu complété (500/500)", () => {
    expect(CompletionRate.from(500, 500).percentage).toBe(100);
  });

  it("vaut 0 pour 0 débloqué (0/64)", () => {
    expect(CompletionRate.from(0, 64).percentage).toBe(0);
  });

  it("vaut 0 pour 0/0 (pas de division par zéro)", () => {
    expect(CompletionRate.from(0, 0).percentage).toBe(0);
  });

  it("rejette unlocked > total", () => {
    expect(() => CompletionRate.from(5, 4)).toThrow(RangeError);
  });

  it("rejette des valeurs négatives", () => {
    expect(() => CompletionRate.from(-1, 10)).toThrow(RangeError);
  });
});
