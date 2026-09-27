import type { AchievementDto, GameProgressDto } from "@steam/contracts";

const achievement = (
  apiName: string,
  displayName: string,
  description: string,
  unlockedAt: string | null,
): AchievementDto => ({
  apiName,
  displayName,
  description,
  hidden: description === "",
  // No artwork: the gallery shows the state a row is in, and an invented
  // address would only draw a broken image where the icon goes.
  icon: "",
  iconGray: "",
  unlocked: unlockedAt !== null,
  unlockedAt,
});

const ACHIEVEMENTS: readonly AchievementDto[] = [
  achievement("ESCAPE", "Is There Anybody Out There?", "Escape the Underworld for the first time.", "2026-06-24T21:12:00Z"),
  achievement("KEEPSAKE", "Sentimental", "Give a Keepsake to someone who asked for it.", "2026-06-24T20:48:00Z"),
  achievement("ROOM_CLEAR", "Chthonic Colleagues", "Clear a chamber without taking damage.", "2026-06-02T19:05:00Z"),
  // Steam leaves the description empty on an achievement hidden until earned.
  achievement("SECRET", "Night and Darkness", "", null),
  achievement("HEAT_32", "Hell Mode Master", "Clear an escape attempt at 32 Heat.", null),
];

/** One game's achievements, some earned across two evenings, some still to come. */
export const gameProgress: GameProgressDto = {
  completion: { unlocked: 3, total: ACHIEVEMENTS.length, percentage: 60 },
  achievements: ACHIEVEMENTS,
  timeline: ACHIEVEMENTS.flatMap((one) =>
    one.unlockedAt === null ? [] : [{ apiName: one.apiName, unlockedAt: one.unlockedAt }],
  ),
};
