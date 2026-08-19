import type { GameDto, GameProgressDto, ProfileDto } from "@steam/contracts";

import { createFixtureApiClient } from "./fixture-api-client";

const profile: ProfileDto = {
  steamId: "76561197979269357",
  personaName: "cariboucolas",
  avatarUrl: "https://avatars/full.jpg",
  profileUrl: "https://steamcommunity.com/profiles/76561197979269357/",
};

const games: readonly GameDto[] = [
  {
    appId: 2066020,
    name: "Soulstone Survivors",
    playtimeMinutes: 4977,
    playtimeLabel: "83 h 57",
    iconUrl: "https://icon/2066020.jpg",
  },
  {
    appId: 440,
    name: "Team Fortress 2",
    playtimeMinutes: 405,
    playtimeLabel: "6 h 45",
    iconUrl: "https://icon/440.jpg",
  },
];

const progress: GameProgressDto = {
  completion: { unlocked: 353, total: 483, percentage: 73.08488612836439 },
  achievements: [],
  timeline: [],
};

const client = createFixtureApiClient({
  profile,
  games,
  progress: { 2066020: progress },
});

describe("createFixtureApiClient", () => {
  it("serves the profile", async () => {
    expect(await client.getProfile()).toEqual({ ok: true, value: profile });
  });

  it("serves the whole library", async () => {
    const result = await client.getGames();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }
  });

  it("serves the progress of a game it has data for", async () => {
    expect(await client.getGameProgress(2066020)).toEqual({
      ok: true,
      value: progress,
    });
  });

  it("reports NOT_FOUND for a game outside the library", async () => {
    expect(await client.getGameProgress(999999)).toEqual({
      ok: false,
      error: "NOT_FOUND",
    });
  });

  it("reports NOT_LOADED for a library game whose progress was never fetched", async () => {
    expect(await client.getGameProgress(440)).toEqual({
      ok: false,
      error: "NOT_LOADED",
    });
  });
});
