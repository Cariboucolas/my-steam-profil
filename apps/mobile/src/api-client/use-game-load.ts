import type { GameDto, GameProgressDto } from "@steam/contracts";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

import { queries } from "../query/queries";
import { ApiFailure, codeOf } from "../query/value-or-throw";
import type { ScreenError } from "../view-models/api-errors";
import { gameInLibrary } from "../view-models/game-progress";
import type { ApiClient } from "./api-client";
import { gamesQuery, NO_PROFILE } from "./games-query";

/** Where the load of one game has got to, as the screen experiences it. */
export type GameLoad =
  | { readonly status: "loading" }
  | {
      readonly status: "error";
      readonly error: ScreenError;
      /** Asks again for what failed, and for nothing that answered. */
      readonly retry: () => void;
    }
  | {
      readonly status: "ready";
      readonly game: GameDto;
      /** Null when the achievements were never fetched for it, which is no failure. */
      readonly progress: GameProgressDto | null;
    };

const LOADING: GameLoad = { status: "loading" };

const nothingToAskAgain = () => undefined;

const NOT_A_GAME_ID: GameLoad = {
  status: "error",
  error: "INVALID_GAME_ID",
  retry: nothingToAskAgain,
};

/**
 * One Game and the player's GameProgress in it.
 *
 * The Games are the query the library fills (#162): opened from the library,
 * a game asks nothing for them. The GameProgress is asked on every visit and
 * kept for nobody (ADR-0005), and when one lands, the tally the library holds
 * for that Game is marked out of date.
 *
 * `apiClient` must be the client of `steamId`.
 */
export const useGameLoad = (
  steamId: string | undefined,
  apiClient: ApiClient | undefined,
  /** As the route read it: not a whole number when the address named no game. */
  appId: number,
): GameLoad => {
  const cache = useQueryClient();
  const isGameId = Number.isInteger(appId);
  const profile = steamId ?? NO_PROFILE;

  const games = useQuery(gamesQuery(steamId, isGameId ? apiClient : undefined));

  // ADR-0004: the backend answers for any appId, so a game outside the library
  // is refused here or nowhere, and its progress is never asked for.
  const game = games.data === undefined ? null : gameInLibrary(games.data, appId);

  const progress = useQuery({
    ...queries.progress(profile, appId),
    queryFn:
      apiClient === undefined || game === null
        ? skipToken
        : async ({ signal }) => {
            const answer = await apiClient.getGameProgress(appId, signal);
            if (answer.ok) {
              void cache.invalidateQueries(queries.tally(profile, appId));
              return answer.value;
            }
            if (answer.error === "NOT_LOADED") {
              // Null rather than a failure, and nothing to retry.
              return null;
            }
            throw new ApiFailure(answer.error);
          },
  });

  if (apiClient === undefined) {
    return LOADING;
  }
  if (!isGameId) {
    return NOT_A_GAME_ID;
  }

  if (games.isPending || (games.isError && games.isFetching)) {
    return LOADING;
  }
  if (games.isError) {
    return { status: "error", error: codeOf(games.error), retry: () => void games.refetch() };
  }
  if (game === null) {
    return { status: "error", error: "NOT_IN_LIBRARY", retry: () => void games.refetch() };
  }

  // Fetching, and not only pending: an answer the cache has not yet let go of
  // is not shown while the one this visit asked for is on its way.
  if (progress.isPending || progress.isFetching) {
    return LOADING;
  }
  if (progress.isError) {
    return { status: "error", error: codeOf(progress.error), retry: () => void progress.refetch() };
  }

  return { status: "ready", game, progress: progress.data };
};
