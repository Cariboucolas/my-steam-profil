import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { SteamGateway } from "./steam/steam-gateway";
import { createFetchHandler, cacheFrom } from "./worker";

const API_KEY = "TEST_KEY";
const HEALTH = "https://api.example.com/health";

const OK = 200;
const SERVICE_UNAVAILABLE = 503;

/** /health reaches no further than the app, so nothing here should be called. */
const refuse = () => {
  throw new Error("this test should not have called Steam");
};

const unusedGateway: SteamGateway = {
  getPlayerSummaries: refuse,
  getOwnedGames: refuse,
  getSchemaForGame: refuse,
  getPlayerAchievements: refuse,
};

/**
 * A Worker started without its secret logs the reason. Spying keeps the test
 * output readable, and lets the log itself be asserted.
 */
let logged: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  logged.mockRestore();
});

describe("worker fetch handler", () => {
  it("serves the app when the environment carries the key", async () => {
    const handle = createFetchHandler(() => unusedGateway);

    const response = await handle(new Request(HEALTH), { STEAM_API_KEY: API_KEY });

    expect(response.status).toBe(OK);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("hands the gateway the key it was given", async () => {
    const createGateway = vi.fn(() => unusedGateway);
    const handle = createFetchHandler(createGateway);

    await handle(new Request(HEALTH), { STEAM_API_KEY: API_KEY });

    expect(createGateway).toHaveBeenCalledWith(API_KEY);
  });

  it("builds the app once, however many requests arrive", async () => {
    const createGateway = vi.fn(() => unusedGateway);
    const handle = createFetchHandler(createGateway);
    const env = { STEAM_API_KEY: API_KEY };

    await handle(new Request(HEALTH), env);
    await handle(new Request(HEALTH), env);

    expect(createGateway).toHaveBeenCalledTimes(1);
  });

  it("refuses to serve without a key, rather than asking Steam anonymously", async () => {
    const createGateway = vi.fn(() => unusedGateway);
    const handle = createFetchHandler(createGateway);

    const response = await handle(new Request(HEALTH), {});

    expect(response.status).toBe(SERVICE_UNAVAILABLE);
    await expect(response.json()).resolves.toEqual({ error: "MISCONFIGURED" });
    expect(createGateway).not.toHaveBeenCalled();
  });

  it("tells the operator what is missing, in the log and not in the answer", async () => {
    const handle = createFetchHandler(() => unusedGateway);

    const response = await handle(new Request(HEALTH), {});

    expect(logged).toHaveBeenCalledWith(expect.stringContaining("MISSING_API_KEY"));
    expect(await response.text()).not.toContain("MISSING_API_KEY");
  });

  it("never puts the key in an answer (ADR-0001)", async () => {
    const handle = createFetchHandler(() => unusedGateway);

    const response = await handle(new Request(HEALTH), { STEAM_API_KEY: API_KEY });

    expect(await response.text()).not.toContain(API_KEY);
  });
});

/**
 * The `caches` global exists on Workers and not under vitest, which is the
 * whole reason the cache is a port rather than something a route reaches for.
 * These cover the adapter between the two.
 */
describe("the Worker's cache", () => {
  const COMPLETION = `https://api.example.com/api/profile/76561197979269357/games/1/completion`;

  it("keeps nothing when the platform offers no cache", async () => {
    const cache = cacheFrom(undefined);

    await cache.put(new Request(COMPLETION), new Response("{}"));

    await expect(cache.match(new Request(COMPLETION))).resolves.toBeUndefined();
  });

  it("uses the cache the platform provides", async () => {
    const stored = new Map<string, Response>();
    const cache = cacheFrom({
      default: {
        match: (request: Request) => Promise.resolve(stored.get(request.url)),
        put: (request: Request, response: Response) => {
          stored.set(request.url, response);
          return Promise.resolve();
        },
      },
    });

    await cache.put(new Request(COMPLETION), new Response('{"unlocked":1}'));
    const hit = await cache.match(new Request(COMPLETION));

    expect(await hit?.text()).toBe('{"unlocked":1}');
  });

  /**
   * Cloudflare's cache refuses some responses outright. A tally that could not
   * be stored is still a tally: the request must be answered, and only an
   * operator needs to know the write failed.
   */
  it("answers anyway when the cache refuses a write", async () => {
    const cache = cacheFrom({
      default: {
        match: () => Promise.resolve(undefined),
        put: () => Promise.reject(new TypeError("cannot cache this response")),
      },
    });

    await expect(
      cache.put(new Request(COMPLETION), new Response("{}")),
    ).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
  });
});
