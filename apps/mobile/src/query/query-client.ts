import { QueryClient } from "@tanstack/react-query";

import { ApiFailure } from "./value-or-throw";

/** How many times a query asks again after the backend was unavailable. */
const RETRIES_WHEN_UNAVAILABLE = 1;

/**
 * Whether a query that failed asks again. Only an unavailable backend can
 * answer differently a second time: a profile that is private, missing or
 * refused stays so, and asking again would only delay saying it (#162).
 */
export const retriesOnceWhenUnavailable = (failureCount: number, failure: unknown): boolean =>
  failureCount < RETRIES_WHEN_UNAVAILABLE &&
  failure instanceof ApiFailure &&
  failure.code === "UNAVAILABLE";

/** What #162 decided for every query, and nothing a caller may relax. */
const DECIDED = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retryOnMount: false,
  retry: retriesOnceWhenUnavailable,
} as const;

/** What a cache may be told on top of what was decided. */
export type QueryClientOptions = {
  /** How long an entry nobody watches is kept. The library's default if absent. */
  readonly gcTime?: number;
};

/**
 * A cache for what the app loaded, with what #162 decided for every query: no
 * refetch the player did not ask for, a failure that holds until it goes
 * stale, and one retry for an unavailable backend.
 *
 * The app builds one, above the routes; a test or a story builds its own.
 */
export const createAppQueryClient = (options: QueryClientOptions = {}): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { ...DECIDED, ...options } } });
