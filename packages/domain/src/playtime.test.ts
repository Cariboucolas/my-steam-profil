import { describe, it, expect } from "vitest";
import { formatPlaytimeExact, Playtime } from "./playtime";

describe("Playtime", () => {
  it("exposes the minutes it was handed", () => {
    expect(Playtime.fromMinutes(405).minutes).toBe(405);
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
  });

  it("tells an absent playtime apart from a measured zero", () => {
    expect(Playtime.fromMinutes(0).minutes).toBe(0);
    expect(Playtime.absent().minutes).toBeNull();
  });

  it("rejects a negative value", () => {
    expect(() => Playtime.fromMinutes(-1)).toThrow(RangeError);
  });
});

/**
 * The rule on its own, free of the object that validates. A screen holding
 * minutes off the wire can apply it without also inheriting a constructor that
 * throws on a figure it did not choose (ADR-0015).
 */
describe("formatPlaytimeExact", () => {
  it("writes hours and minutes, dropping whichever half is empty", () => {
    expect(formatPlaytimeExact(405)).toBe("6 h 45");
    expect(formatPlaytimeExact(120)).toBe("2 h");
    expect(formatPlaytimeExact(45)).toBe("45 min");
    expect(formatPlaytimeExact(0)).toBe("0 min");
  });

  /** So the minutes column never reads `2 h 5` for five past the hour. */
  it("pads the minutes so the figure is read as a clock is", () => {
    expect(formatPlaytimeExact(125)).toBe("2 h 05");
  });
});
