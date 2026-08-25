import { ok, err, type Result } from "@steam/domain";
import type {
  GameCompletionDto,
  GameDto,
  GameProgressDto,
  ProfileDto,
} from "@steam/contracts";

import type { ApiClient, ProgressError } from "./api-client";

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
export const createFixtureApiClient = (data: FixtureData): ApiClient => {
  const progressOf = (
    appId: number,
  ): Result<GameProgressDto, ProgressError> => {
    const fetched = data.progress[appId];
    if (fetched) {
      return ok(fetched);
    }
    const inLibrary = data.games.some((game) => game.appId === appId);
    return err(inLibrary ? "NOT_LOADED" : "NOT_FOUND");
  };

  return {
    getProfile: () => Promise.resolve(ok(data.profile)),

    getGames: () => Promise.resolve(ok(data.games)),

    getGameProgress: (appId) => Promise.resolve(progressOf(appId)),

    /**
     * The fixture build stored whole progress, so a tally is read back out of
     * it. The real client asks a cheaper endpoint; both answer the same shape,
     * which is what lets a screen not care which one it is holding.
     */
    getGameCompletion: (appId) => {
      const progress = progressOf(appId);
      return Promise.resolve(
        progress.ok ? ok<GameCompletionDto>(progress.value.completion) : progress,
      );
    },
  };
};
