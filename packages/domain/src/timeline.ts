import { type Achievement } from "./achievement";

export interface TimelineEntry {
  readonly achievement: Achievement;
  readonly at: Date;
}

/** Unlocked achievements only, sorted by ascending unlock date. */
export const buildTimeline = (
  achievements: readonly Achievement[],
): TimelineEntry[] => {
  return achievements
    .flatMap((achievement) =>
      achievement.unlockState.unlocked
        ? [{ achievement, at: achievement.unlockState.at }]
        : [],
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime());
};
