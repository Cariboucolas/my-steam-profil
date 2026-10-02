import type { GameDto, ProfileDto } from "@steam/contracts";
import { skipToken, useQuery } from "@tanstack/react-query";

import { queries } from "../query/queries";
import { codeOf, valueOrThrow } from "../query/value-or-throw";
import type { ApiClient, ApiError } from "./api-client";
import { gamesQuery, NO_PROFILE } from "./games-query";

/** Where the library's first load has got to, as the screen experiences it. */
export type LibraryLoad =
  | { readonly status: "loading" }
  | {
      readonly status: "error";
      readonly error: ApiError;
      /** Asks again for what failed, and for nothing that answered. */
      readonly retry: () => void;
    }
  | {
      readonly status: "ready";
      readonly profile: ProfileDto;
      /**
       * The same array for as long as the library has not changed, however
       * often it is asked for: the tallies are counted off this identity.
       */
      readonly games: readonly GameDto[];
    };

const LOADING: LibraryLoad = { status: "loading" };

/**
 * A query that had an answer and failed when asked again keeps both, and stays
 * failed while it asks once more. That wait is a load like the first one.
 */
const isAskingAgain = (load: { readonly isError: boolean; readonly isFetching: boolean }) =>
  load.isError && load.isFetching;

/**
 * The Profile and the Games it owns, from the cache above the routes (#162):
 * a screen that mounts while they are fresh asks nothing.
 *
 * The keys carry the SteamId, so another Profile starts from nothing at the
 * very render it is chosen on, and what was still asked for the previous one
 * is abandoned. `apiClient` must be the client of `steamId`.
 */
export const useLibraryLoad = (
  steamId: string | undefined,
  apiClient: ApiClient | undefined,
): LibraryLoad => {
  const profile = useQuery({
    ...queries.profile(steamId ?? NO_PROFILE),
    queryFn:
      apiClient === undefined
        ? skipToken
        : ({ signal }) => apiClient.getProfile(signal).then(valueOrThrow),
  });
  const games = useQuery(gamesQuery(steamId, apiClient));

  // Both have to settle before either is reported, so a Profile that failed
  // fast does not flash its failure ahead of a library still on its way.
  if (profile.isPending || games.isPending || isAskingAgain(profile) || isAskingAgain(games)) {
    return LOADING;
  }

  const retry = () => {
    if (profile.isError) void profile.refetch();
    if (games.isError) void games.refetch();
  };

  if (profile.isError) {
    return { status: "error", error: codeOf(profile.error), retry };
  }
  if (games.isError) {
    return { status: "error", error: codeOf(games.error), retry };
  }

  return { status: "ready", profile: profile.data, games: games.data };
};
