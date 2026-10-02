import { queryOptions, skipToken } from "@tanstack/react-query";

import { queries } from "../query/queries";
import { valueOrThrow } from "../query/value-or-throw";
import type { ApiClient } from "./api-client";

/** Names nobody: the key of a query that is not run while no Profile is chosen. */
export const NO_PROFILE = "";

/**
 * The Games a Profile owns, as every page asks for them: one key and one
 * question, so the page that opens second reads what the first one loaded
 * (#162). Asks nothing while there is no client. `apiClient` must be the
 * client of `steamId`.
 */
export const gamesQuery = (steamId: string | undefined, apiClient: ApiClient | undefined) =>
  queryOptions({
    ...queries.games(steamId ?? NO_PROFILE),
    queryFn:
      apiClient === undefined
        ? skipToken
        : ({ signal }) => apiClient.getGames(signal).then(valueOrThrow),
  });
