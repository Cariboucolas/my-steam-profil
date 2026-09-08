import { describe, it, expect } from "vitest";
import { Hono } from "hono";

import { cached, type ResponseCache } from "./cache";

/** A cache with the Cloudflare Cache API's shape and a Map behind it. */
const mapCache = (): ResponseCache => {
  const entries = new Map<string, Response>();
  return {
    match: (request) => {
      const hit = entries.get(request.url);
      return Promise.resolve(hit ? hit.clone() : undefined);
    },
    put: (request, response) => {
      entries.set(request.url, response.clone());
      return Promise.resolve();
    },
  };
};

/** The smallest thing that can be cached: one route, answering one word. */
const routeKeepingAnswersFor = (seconds: number): Hono => {
  const app = new Hono();
  app.get(
    "/",
    cached(mapCache(), seconds, (context) => Promise.resolve(context.json({ answered: true }))),
  );
  return app;
};

const lifetimeOf = async (app: Hono): Promise<string | null> =>
  (await app.request("/")).headers.get("cache-control");

/**
 * Two routes, two answers worth keeping for entirely different lengths of time:
 * one that goes stale in minutes, one that barely moves in a day. What separates
 * them is the route's own statement, not a constant the helper reads.
 */
describe("how long an answer is kept", () => {
  const FIVE_MINUTES = 300;
  const ONE_DAY = 86_400;

  it("keeps an answer for as long as its own route asked", async () => {
    expect(await lifetimeOf(routeKeepingAnswersFor(FIVE_MINUTES))).toBe("max-age=300");
    expect(await lifetimeOf(routeKeepingAnswersFor(ONE_DAY))).toBe("max-age=86400");
  });

  it("serves a kept answer with the lifetime it was stored under", async () => {
    const app = routeKeepingAnswersFor(ONE_DAY);

    await app.request("/");

    expect(await lifetimeOf(app)).toBe("max-age=86400");
  });
});
