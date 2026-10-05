import { err, ok } from "@steam/domain";

import type { ApiError } from "../api-client";
import { askThroughCache } from "./ask-through-cache";
import { createAppQueryClient } from "./query-client";

const QUERY = { queryKey: ["answer", 1], staleTime: 1000 } as const;

/** Records each time the backend is asked, and answers `answer`. */
const backend = <Value>(answer: () => Value) => {
  const asked: AbortSignal[] = [];
  const ask = (signal: AbortSignal) => {
    asked.push(signal);
    return Promise.resolve(answer());
  };
  return { ask, asked };
};

const freshCache = () => createAppQueryClient({ gcTime: Infinity, retryDelay: 0 });

describe("askThroughCache", () => {
  afterEach(() => jest.restoreAllMocks());

  it("answers what the backend answered, and asks it once while that is fresh", async () => {
    const cache = freshCache();
    const { ask, asked } = backend(() => ok("named"));

    await expect(askThroughCache(cache, QUERY, ask)).resolves.toEqual(ok("named"));
    await expect(askThroughCache(cache, QUERY, ask)).resolves.toEqual(ok("named"));

    expect(asked).toHaveLength(1);
  });

  /** A failure holds as long as an answer would (#162): asking again is a gesture (#164). */
  it("answers a failure without asking again while it is fresh", async () => {
    const cache = freshCache();
    const { ask, asked } = backend(() => err<ApiError>("NOT_FOUND"));

    expect((await askThroughCache(cache, QUERY, ask)).ok).toBe(false);
    expect((await askThroughCache(cache, QUERY, ask)).ok).toBe(false);

    expect(asked).toHaveLength(1);
  });

  it("asks again once a failure is older than the query's freshness", async () => {
    const cache = freshCache();
    const { ask, asked } = backend(() => err<ApiError>("NOT_FOUND"));
    await askThroughCache(cache, QUERY, ask);

    jest.spyOn(Date, "now").mockReturnValue(Date.now() + QUERY.staleTime);
    await askThroughCache(cache, QUERY, ask);

    expect(asked).toHaveLength(2);
  });
});
