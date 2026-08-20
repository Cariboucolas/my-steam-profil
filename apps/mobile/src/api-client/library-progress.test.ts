import type { GameDto, GameProgressDto, ProfileDto } from "@steam/contracts";

import { createFixtureApiClient } from "./fixture-api-client";
import { loadLibraryProgress } from "./library-progress";

const profile: ProfileDto = {
  steamId: "76561197979269357",
  personaName: "cariboucolas",
  avatarUrl: "https://avatars/full.jpg",
  profileUrl: "https://steamcommunity.com/profiles/76561197979269357/",
};

const game = (appId: number, lastPlayedAt: string | null): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 100,
  playtimeLabel: "1 h 40",
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt,
});

const progress = (unlocked: number): GameProgressDto => ({
  completion: { unlocked, total: 10, percentage: unlocked * 10 },
  achievements: [],
  timeline: [],
});

const NEWEST = game(1, "2026-06-25T00:00:00.000Z");
const MIDDLE = game(2, "2026-03-01T00:00:00.000Z");
const OLDEST = game(3, "2020-01-01T00:00:00.000Z");
const NEVER_PLAYED = game(4, null);

const GAMES = [OLDEST, NEVER_PLAYED, NEWEST, MIDDLE] as const;

const clientKnowing = (known: Record<number, GameProgressDto>) =>
  createFixtureApiClient({ profile, games: GAMES, progress: known });

describe("loadLibraryProgress", () => {
  it("loads the games played most recently first", async () => {
    const client = clientKnowing({ 1: progress(1), 2: progress(2), 3: progress(3) });

    const loaded = await loadLibraryProgress(client, GAMES, 2);

    expect(Object.keys(loaded).sort()).toEqual(["1", "2"]);
  });

  it("never asks for more than it was told to", async () => {
    const client = clientKnowing({ 1: progress(1), 2: progress(2), 3: progress(3) });

    expect(Object.keys(await loadLibraryProgress(client, GAMES, 1))).toHaveLength(1);
  });

  it("skips a game that was never launched, which has nothing to show", async () => {
    const client = clientKnowing({ 4: progress(4) });

    expect(await loadLibraryProgress(client, GAMES, 10)).toEqual({});
  });

  it("keeps what it could load when one game fails", async () => {
    // The fixture client reports NOT_LOADED for a game it has no data for.
    const client = clientKnowing({ 1: progress(1) });

    expect(await loadLibraryProgress(client, GAMES, 3)).toEqual({ 1: progress(1) });
  });

  it("has nothing to load from an empty library", async () => {
    const client = clientKnowing({});
    expect(await loadLibraryProgress(client, [], 5)).toEqual({});
  });
});
