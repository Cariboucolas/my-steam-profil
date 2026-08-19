import { ok, err } from "@steam/domain";
import type { GameDto, GameProgressDto, ProfileDto } from "@steam/contracts";

import type { ApiClient } from "./api-client";

export type FixtureData = {
  readonly profile: ProfileDto;
  readonly games: readonly GameDto[];
  /** Keyed by appId; only the games the spike actually fetched are present. */
  readonly progress: Readonly<Record<number, GameProgressDto>>;
};

/**
 * Serves the DTOs the fixture build produced. Data is injected rather than
 * imported so tests can run without the generated files, which stay out of the
 * repository.
 */
export const createFixtureApiClient = (data: FixtureData): ApiClient => ({
  getProfile: () => Promise.resolve(ok(data.profile)),

  getGames: () => Promise.resolve(ok(data.games)),

  getGameProgress: (appId) => {
    const fetched = data.progress[appId];
    if (fetched) {
      return Promise.resolve(ok(fetched));
    }
    const inLibrary = data.games.some((game) => game.appId === appId);
    return Promise.resolve(err(inLibrary ? "NOT_LOADED" : "NOT_FOUND"));
  },
});
