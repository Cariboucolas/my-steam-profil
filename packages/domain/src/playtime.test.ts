import { describe, it, expect } from "vitest";
import { Playtime } from "./playtime";

describe("Playtime", () => {
  it("expose les minutes et les heures", () => {
    const p = Playtime.fromMinutes(405);
    expect(p.minutes).toBe(405);
    expect(p.hours).toBeCloseTo(6.75, 2);
  });

  it("formate en heures et minutes", () => {
    expect(Playtime.fromMinutes(405).format()).toBe("6 h 45");
    expect(Playtime.fromMinutes(120).format()).toBe("2 h");
    expect(Playtime.fromMinutes(45).format()).toBe("45 min");
    expect(Playtime.fromMinutes(0).format()).toBe("0 min");
  });

  it("rejette une valeur négative", () => {
    expect(() => Playtime.fromMinutes(-1)).toThrow(RangeError);
  });
});
