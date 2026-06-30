import { describe, it, expect } from "vitest";
import { buildTimeline } from "./timeline";
import { type Achievement } from "./achievement";

const unlockedAchievement = (apiName: string, atSeconds: number): Achievement => ({
  apiName,
  displayName: apiName,
  description: "",
  hidden: false,
  icon: "",
  iconGray: "",
  unlockState: { unlocked: true, at: new Date(atSeconds * 1000) },
});

const lockedAchievement = (apiName: string): Achievement => ({
  apiName,
  displayName: apiName,
  description: "",
  hidden: false,
  icon: "",
  iconGray: "",
  unlockState: { unlocked: false },
});

// Steam counts in seconds, JS Date in milliseconds.
const SECONDS_TO_MS = 1000;

// Two instants chosen ONLY for their relative order (the actual date does not matter).
const EARLIER_UNLOCK_SECONDS = 1000;
const LATER_UNLOCK_SECONDS = 2000;

describe("buildTimeline", () => {
  it("keeps only unlocked achievements, sorted by ascending date", () => {
    const achievements = [
      unlockedAchievement("late", LATER_UNLOCK_SECONDS),
      lockedAchievement("never"),
      unlockedAchievement("early", EARLIER_UNLOCK_SECONDS),
    ];
    const timeline = buildTimeline(achievements);
    expect(timeline.map((e) => e.achievement.apiName)).toEqual(["early", "late"]);
    expect(timeline[0]?.at.getTime()).toBe(EARLIER_UNLOCK_SECONDS * SECONDS_TO_MS);
  });

  it("returns an empty timeline when nothing is unlocked", () => {
    expect(buildTimeline([lockedAchievement("a")])).toEqual([]);
  });
});
