import { err, ok, type Result } from "@steam/domain";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { ProgressError } from "../api-client";
import { valueOrThrow } from "./value-or-throw";

/** An entry of the query-key factory: where an answer is kept, and for how long. */
type CachedQuery = {
  readonly queryKey: QueryKey;
  readonly staleTime: number;
  readonly gcTime?: number;
};

/**
 * Whether the query under `key` failed less than a freshness ago. A failure
 * holds as long as an answer would (#162): asking again is the player's
 * gesture (#164), not another screen's.
 *
 * On the date alone: the cache marks a query out of date the moment it fails,
 * so a failure cannot be told from one marked out of date afterwards.
 */
const failedRecently = (cache: QueryClient, key: QueryKey, freshFor: number): boolean => {
  const state = cache.getQueryState(key);
  return state?.status === "error" && Date.now() - state.errorUpdatedAt < freshFor;
};

/**
 * One answer about one Game, from the cache above the routes when it holds a
 * fresh one, from the backend otherwise. Answers a `Result` again, as a wave
 * expects: the cache is a detail of where the answer came from.
 *
 * What a wave asks once per Game goes through here rather than through a
 * query a screen observes: one render per answer, with hundreds of them, was
 * measured to slow the library down (#168).
 */
export const askThroughCache = async <Value>(
  cache: QueryClient,
  query: CachedQuery,
  ask: (signal: AbortSignal) => Promise<Result<Value, ProgressError>>,
): Promise<Result<Value, unknown>> => {
  if (failedRecently(cache, query.queryKey, query.staleTime)) {
    return err("FAILED_RECENTLY");
  }
  try {
    return ok(
      await cache.fetchQuery({
        ...query,
        queryFn: ({ signal }) => ask(signal).then(valueOrThrow),
      }),
    );
  } catch (failure) {
    return err(failure);
  }
};
