import { describe, it, expect } from "vitest";
import { Playtime } from "./playtime";

describe("Playtime", () => {
  it("exposes minutes and hours", () => {
    const p = Playtime.fromMinutes(405);
    expect(p.minutes).toBe(405);
    expect(p.hours).toBeCloseTo(6.75, 2);
  });

  it("formats as hours and minutes", () => {
    expect(Playtime.fromMinutes(405).format()).toBe("6 h 45");
    expect(Playtime.fromMinutes(120).format()).toBe("2 h");
    expect(Playtime.fromMinutes(45).format()).toBe("45 min");
    expect(Playtime.fromMinutes(0).format()).toBe("0 min");
  });

  /**
   * Steam governs playtime's visibility on its own, so a library can publish
   * every unlock and withhold every hour (CONTEXT.md, Playtime). What it
   * withholds is absent, never a zero: a zero is a Game that was never
   * launched, and reading one as the other calls a Game unplayed beside the
   * Unlocks that prove it was played.
   */
  it("has no figure at all where Steam declines to report one", () => {
    const absent = Playtime.absent();

    expect(absent.minutes).toBeNull();
    expect(absent.hours).toBeNull();
    expect(absent.format()).toBeNull();
  });

  it("tells an absent playtime apart from a measured zero", () => {
    expect(Playtime.fromMinutes(0).minutes).toBe(0);
    expect(Playtime.fromMinutes(0).format()).toBe("0 min");
  });

  it("rejects a negative value", () => {
    expect(() => Playtime.fromMinutes(-1)).toThrow(RangeError);
  });
});
