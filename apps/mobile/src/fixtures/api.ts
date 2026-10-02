import type { AchievementDto, GameDto, GameProgressDto, GameRarityDto } from "@steam/contracts";

import type { FixtureData } from "../api-client/fixture-api-client";
import { LIBRARY_GAMES } from "./library";
import { FIXTURE_PROFILE } from "./profile";

/** Late evening, so an unlock falls on its day in any time zone near UTC. */
const UNLOCK_HOUR = 20;

/**
 * How far back, in days, the unlocks of one game are spread: over a year and a
 * half, so the calendar holds this year and the whole of the last.
 */
const SPREAD_DAYS = 540;

/** A prime step, so one game's unlocks scatter across the spread rather than bunching. */
const STEP_DAYS = 37;

/** What each game has earned of what it defines. */
const COMPLETION: Readonly<Record<number, readonly [unlocked: number, total: number]>> = {
  1245620: [42, 42],
  1145360: [38, 49],
  413150: [31, 40],
  367520: [17, 63],
};

/** Achievements earned on days counted back from `today`, never after it. */
const achievementsOf = (
  appId: number,
  [unlocked, total]: readonly [number, number],
  today: Date,
): readonly AchievementDto[] =>
  Array.from({ length: total }, (_, index) => {
    const earned = index < unlocked;
    const daysAgo = (index * STEP_DAYS) % SPREAD_DAYS;
    const at = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - daysAgo,
      UNLOCK_HOUR,
    );
    return {
      apiName: `ACH_${appId}_${index}`,
      displayName: `Achievement ${index + 1}`,
      description: "Earned somewhere along the way.",
      hidden: false,
      icon: "",
      iconGray: "",
      unlocked: earned,
      unlockedAt: earned ? at.toISOString() : null,
    };
  });

const progressOf = (game: GameDto, today: Date): GameProgressDto | null => {
  const completion = COMPLETION[game.appId];
  if (!completion) return null;

  const achievements = achievementsOf(game.appId, completion, today);
  const [unlocked, total] = completion;
  return {
    completion: { unlocked, total, percentage: (unlocked / total) * 100 },
    achievements,
    timeline: achievements.flatMap((one) =>
      one.unlockedAt === null ? [] : [{ apiName: one.apiName, unlockedAt: one.unlockedAt }],
    ),
  };
};

/** Steam's figures for a game's first few achievements, rarest first. */
const rarityOf = (game: GameDto): GameRarityDto =>
  [0.3, 1.8, 6.4, 22].map((rarity, index) => ({
    apiName: `ACH_${game.appId}_${index}`,
    rarity,
  }));

/**
 * The fixture player's whole library as the backend would serve it on
 * `today`: profile, games, each game's dated progress, and what Steam
 * publishes about their rarity.
 *
 * `except` leaves a game's progress out, which is what a game whose
 * achievements were never loaded looks like to a page.
 */
export const libraryServedOn = (
  today: Date,
  {
    games = LIBRARY_GAMES,
    except = [],
  }: { games?: readonly GameDto[]; except?: readonly number[] } = {},
): FixtureData => ({
  profile: FIXTURE_PROFILE,
  games,
  progress: Object.fromEntries(
    games.flatMap((game) => {
      const progress = except.includes(game.appId) ? null : progressOf(game, today);
      return progress === null ? [] : [[game.appId, progress]];
    }),
  ),
  rarity: Object.fromEntries(games.map((game) => [game.appId, rarityOf(game)])),
});
