import type { GameDto, GameProgressDto } from "@steam/contracts";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

import { isAskingAgain } from "../query/is-asking-again";
import { NOBODY, queries } from "../query/queries";
import { ApiFailure, codeOf } from "../query/value-or-throw";
import type { ScreenError } from "../view-models/api-errors";
import { gameInLibrary } from "../view-models/game-progress";
import type { ApiClient } from "./api-client";
import { gamesQuery } from "./games-query";

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
 * The player's GameProgress in one Game: asked on every visit and kept for
 * nobody (ADR-0005). Asks nothing while there is no client, and none is handed
 * in for a game outside the library.
 *
 * Achievements never fetched are an answer, null, and no failure. When a
 * GameProgress lands, the tally the library holds for that Game is marked out
 * of date; when none came back, it is left alone.
 */
const useProgressIn = (
  steamId: string | undefined,
  apiClient: ApiClient | undefined,
  appId: number,
) => {
  const cache = useQueryClient();
  const steamIdOrNobody = steamId ?? NOBODY;

  return useQuery({
    ...queries.progress(steamIdOrNobody, appId),
    queryFn:
      apiClient === undefined
        ? skipToken
        : async ({ signal }): Promise<GameProgressDto | null> => {
            const answer = await apiClient.getGameProgress(appId, signal);
            if (answer.ok) {
              void cache.invalidateQueries(queries.tally(steamIdOrNobody, appId));
              return answer.value;
            }
            if (answer.error === "NOT_LOADED") {
              return null;
            }
            throw new ApiFailure(answer.error);
          },
  });
};

/**
 * One Game and the player's GameProgress in it.
 *
 * The Games are the query the library fills (#162): opened from the library,
 * a game asks nothing for them.
 *
 * `apiClient` must be the client of `steamId`.
 */
export const useGameLoad = (
  steamId: string | undefined,
  apiClient: ApiClient | undefined,
  /** As the route read it: not a whole number when the address named no game. */
  appId: number,
): GameLoad => {
  const isGameId = Number.isInteger(appId);

  const games = useQuery(gamesQuery(steamId, isGameId ? apiClient : undefined));

  // ADR-0004: the backend answers for any appId, so a game outside the library
  // is refused here or nowhere, and its progress is never asked for.
  const game = games.data === undefined ? null : gameInLibrary(games.data, appId);

  const progress = useProgressIn(steamId, game === null ? undefined : apiClient, appId);

  if (apiClient === undefined) {
    return LOADING;
  }
  if (!isGameId) {
    return NOT_A_GAME_ID;
  }

  const askForTheGamesAgain = () => void games.refetch();

  if (games.isPending || isAskingAgain(games)) {
    return LOADING;
  }
  if (games.isError) {
    return { status: "error", error: codeOf(games.error), retry: askForTheGamesAgain };
  }
  if (game === null) {
    return { status: "error", error: "NOT_IN_LIBRARY", retry: askForTheGamesAgain };
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
