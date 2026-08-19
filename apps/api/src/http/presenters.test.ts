import { describe, it, expect } from "vitest";
import {
  toProfileDto,
  toGameDto,
  toAchievementDto,
  toGameProgressDto,
  emptyGameProgressDto,
} from "./presenters";
import {
  SteamId,
  Playtime,
  unlockStateFromSteam,
  computeGameCompletion,
  buildTimeline,
  type Profile,
  type Game,
  type Achievement,
} from "@steam/domain";

const UNLOCK_SECONDS = 1697568656;
const SECONDS_TO_MS = 1000;

const steamId = (() => {
  const created = SteamId.create("76561197979269357");
  if (!created.ok) throw new Error("fixture steam id is invalid");
  return created.value;
})();

describe("toProfileDto", () => {
  it("flattens the SteamId value object into a plain string", () => {
    const profile: Profile = {
      steamId,
      personaName: "cariboucolas",
      avatarUrl: "https://avatars/full.jpg",
      profileUrl: "https://steamcommunity.com/profiles/76561197979269357/",
    };
    expect(toProfileDto(profile)).toEqual({
      steamId: "76561197979269357",
      personaName: "cariboucolas",
      avatarUrl: "https://avatars/full.jpg",
      profileUrl: "https://steamcommunity.com/profiles/76561197979269357/",
    });
  });
});

describe("toGameDto", () => {
  const LAST_PLAYED_SECONDS = 1782389774;

  const game: Game = {
    appId: 440,
    name: "Team Fortress 2",
    playtime: Playtime.fromMinutes(405),
    iconUrl: "https://icon/440.jpg",
    lastPlayed: new Date(LAST_PLAYED_SECONDS * SECONDS_TO_MS),
  };

  it("exposes both raw minutes and a human label for playtime", () => {
    expect(toGameDto(game)).toEqual({
      appId: 440,
      name: "Team Fortress 2",
      playtimeMinutes: 405,
      playtimeLabel: "6 h 45",
      iconUrl: "https://icon/440.jpg",
      lastPlayedAt: new Date(LAST_PLAYED_SECONDS * SECONDS_TO_MS).toISOString(),
    });
  });

  it("carries a null last played date for a game that was never launched", () => {
    expect(toGameDto({ ...game, lastPlayed: null }).lastPlayedAt).toBeNull();
  });
});

describe("toAchievementDto", () => {
  const base: Omit<Achievement, "unlockState"> = {
    apiName: "BOSS_1",
    displayName: "First boss",
    description: "Beat the first boss.",
    hidden: false,
    icon: "icon1.jpg",
    iconGray: "gray1.jpg",
  };

  it("serialises an unlocked achievement with an ISO date", () => {
    const achievement: Achievement = {
      ...base,
      unlockState: unlockStateFromSteam(1, UNLOCK_SECONDS),
    };
    const dto = toAchievementDto(achievement);
    expect(dto.unlocked).toBe(true);
    expect(dto.unlockedAt).toBe(
      new Date(UNLOCK_SECONDS * SECONDS_TO_MS).toISOString(),
    );
  });

  it("serialises a locked achievement with a null date", () => {
    const achievement: Achievement = {
      ...base,
      unlockState: unlockStateFromSteam(0, 0),
    };
    const dto = toAchievementDto(achievement);
    expect(dto.unlocked).toBe(false);
    expect(dto.unlockedAt).toBeNull();
  });
});

describe("toGameProgressDto", () => {
  const achievements: Achievement[] = [
    {
      apiName: "BOSS_1",
      displayName: "First boss",
      description: "",
      hidden: false,
      icon: "i",
      iconGray: "g",
      unlockState: unlockStateFromSteam(1, UNLOCK_SECONDS),
    },
    {
      apiName: "SECRET_1",
      displayName: "Secret",
      description: "",
      hidden: true,
      icon: "i",
      iconGray: "g",
      unlockState: unlockStateFromSteam(0, 0),
    },
  ];

  it("shapes completion, achievements and timeline", () => {
    const dto = toGameProgressDto({
      completion: computeGameCompletion(achievements),
      achievements,
      timeline: buildTimeline(achievements),
    });
    expect(dto.completion).toEqual({ unlocked: 1, total: 2, percentage: 50 });
    expect(dto.achievements).toHaveLength(2);
    expect(dto.timeline).toEqual([
      {
        apiName: "BOSS_1",
        unlockedAt: new Date(UNLOCK_SECONDS * SECONDS_TO_MS).toISOString(),
      },
    ]);
  });

  it("keeps the unrounded percentage so clients choose their own precision", () => {
    const dto = toGameProgressDto({
      completion: computeGameCompletion(achievements.slice(0, 1)),
      achievements: achievements.slice(0, 1),
      timeline: [],
    });
    expect(dto.completion.percentage).toBe(100);
  });
});

describe("emptyGameProgressDto", () => {
  it("represents a game that has no achievements", () => {
    expect(emptyGameProgressDto()).toEqual({
      completion: { unlocked: 0, total: 0, percentage: 0 },
      achievements: [],
      timeline: [],
    });
  });
});
