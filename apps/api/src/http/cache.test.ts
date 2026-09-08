import { describe, it, expect } from "vitest";
import { Hono } from "hono";

import { cached } from "./cache";
import { mapCache } from "./cache.test-support";

/** The smallest thing that can be cached: one route, answering one word. */
const routeKeepingAnswersFor = (seconds: number): Hono => {
  const app = new Hono();
  app.get(
    "/",
    cached(mapCache(), seconds, (context) =>
      Promise.resolve(context.json({ answered: true })),
    ),
  );
  return app;
};

/** Asks the route, and reads back what it says about keeping the answer. */
const cacheControlWhenAsked = async (app: Hono): Promise<string | null> =>
  (await app.request("/")).headers.get("cache-control");

/**
 * Two answers worth keeping for entirely different lengths of time: one that
 * goes stale in minutes, one that barely moves in a day. What separates them is
 * the route's own statement, not a constant the helper reads.
 */
describe("how long an answer is kept", () => {
  const FIVE_MINUTES = 300;
  const ONE_DAY = 86_400;

  it("keeps an answer for as long as its own route asked", async () => {
    const brief = routeKeepingAnswersFor(FIVE_MINUTES);
    const long = routeKeepingAnswersFor(ONE_DAY);

    expect(await cacheControlWhenAsked(brief)).toBe("max-age=300");
    expect(await cacheControlWhenAsked(long)).toBe("max-age=86400");
  });

  it("serves a kept answer with the lifetime it was stored under", async () => {
    const app = routeKeepingAnswersFor(ONE_DAY);

    await app.request("/");

    expect(await cacheControlWhenAsked(app)).toBe("max-age=86400");
  });
});
