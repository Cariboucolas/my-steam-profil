import type { Profile, Game, Achievement } from "@steam/domain";
import type {
  ProfileDto,
  GameDto,
  AchievementDto,
  GameProgressDto,
} from "@steam/contracts";
import type { GameProgress } from "../steam/steam-mapper";

export const toProfileDto = (profile: Profile): ProfileDto => ({
  steamId: profile.steamId.value,
  personaName: profile.personaName,
  avatarUrl: profile.avatarUrl,
  profileUrl: profile.profileUrl,
});

export const toGameDto = (game: Game): GameDto => ({
  appId: game.appId,
  name: game.name,
  playtimeMinutes: game.playtime.minutes,
  playtimeLabel: game.playtime.format(),
  iconUrl: game.iconUrl,
});

export const toAchievementDto = (achievement: Achievement): AchievementDto => ({
  apiName: achievement.apiName,
  displayName: achievement.displayName,
  description: achievement.description,
  hidden: achievement.hidden,
  icon: achievement.icon,
  iconGray: achievement.iconGray,
  unlocked: achievement.unlockState.unlocked,
  unlockedAt: achievement.unlockState.unlocked
    ? achievement.unlockState.at.toISOString()
    : null,
});

export const toGameProgressDto = (data: GameProgress): GameProgressDto => ({
  completion: {
    unlocked: data.completion.unlocked,
    total: data.completion.total,
    // Unrounded on purpose: a client can round, it cannot recover precision.
    percentage: data.completion.rate.percentage,
  },
  achievements: data.achievements.map(toAchievementDto),
  timeline: data.timeline.map((entry) => ({
    apiName: entry.achievement.apiName,
    unlockedAt: entry.at.toISOString(),
  })),
});

/** A game Steam defines no achievements for: a valid, empty progress. */
export const emptyGameProgressDto = (): GameProgressDto => ({
  completion: { unlocked: 0, total: 0, percentage: 0 },
  achievements: [],
  timeline: [],
});
