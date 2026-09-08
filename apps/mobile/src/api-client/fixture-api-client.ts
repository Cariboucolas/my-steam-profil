import { ok, err, type Result } from "@steam/domain";
import type {
  GameDto,
  GameProgressDto,
  GameRarityDto,
  GameTallyDto,
  ProfileDto,
} from "@steam/contracts";

import type { ApiClient, ProgressError } from "./api-client";

const MS_PER_SECOND = 1000;

export type FixtureData = {
  readonly profile: ProfileDto;
  readonly games: readonly GameDto[];
  /** Keyed by appId; only the games the spike actually fetched are present. */
  readonly progress: Readonly<Record<number, GameProgressDto>>;
  /**
   * Keyed by appId. Optional, and empty in the generated set: the spike never
   * called the Steam endpoint that publishes rarity, so there is nothing to
   * store yet. A set that carries some is what lets a ranking be exercised.
   */
  readonly rarity?: Readonly<Record<number, GameRarityDto>>;
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
     *
     * The dates come from the Timeline, which is already earliest first, and
     * are put back into the epoch seconds the wire uses.
     */
    getGameTally: (appId) => {
      const progress = progressOf(appId);
      return Promise.resolve(
        progress.ok
          ? ok<GameTallyDto>({
              completion: progress.value.completion,
              unlockedAt: progress.value.timeline.map((entry) =>
                Math.floor(Date.parse(entry.unlockedAt) / MS_PER_SECOND),
              ),
            })
          : progress,
      );
    },

    /**
     * Answers for any game asked about, exactly as the backend does: the rarity
     * route checks no library, because ownership is the caller's to know
     * (ADR-0004). A game with nothing stored answers with nothing, which is
     * what "Steam publishes no figures for this game" looks like — never a
     * refusal, and never a list of zeroes.
     */
    getGameRarity: (appId) =>
      Promise.resolve(ok<GameRarityDto>(data.rarity?.[appId] ?? [])),
  };
};
