import type { Hono } from "hono";

import { createApp } from "./http/app";
import { loadConfig } from "./http/config";
import { createSteamClient } from "./steam/steam-client";
import type { SteamGateway } from "./steam/steam-gateway";
import { noCache, type ResponseCache } from "./http/cache";

/**
 * What Cloudflare hands the Worker in place of process.env.
 *
 * A type alias and not an interface, deliberately: only a type alias receives
 * TypeScript's implicit index signature, which is what lets it be passed to
 * loadConfig, whose parameter is Readonly<Record<string, string | undefined>>.
 * An interface here would fail to compile for a reason that reads like a bug.
 */
export type WorkerEnv = {
  readonly STEAM_API_KEY?: string;
};

/**
 * What Cloudflare adds to the standard `caches` global: a ready-made cache
 * shared by every request the zone serves. It is not in the DOM lib's
 * CacheStorage, and it is absent entirely under `tsx` and vitest.
 */
type PlatformCaches = {
  readonly default?: ResponseCache;
};

/**
 * Adapts the platform's cache to the port the app depends on, and falls back to
 * remembering nothing when there is no platform cache — which is every
 * environment that is not a Worker.
 *
 * A write that Cloudflare refuses (it rejects some responses outright) must not
 * fail the request: an answer that could not be cached is still an answer. The
 * failure goes to the log, where `wrangler tail` will find it.
 */
export const cacheFrom = (platform: PlatformCaches | undefined): ResponseCache => {
  const store = platform?.default;
  if (!store) return noCache;

  return {
    match: (request) => store.match(request),
    put: async (request, response) => {
      try {
        await store.put(request, response);
      } catch (cause) {
        console.error("Could not cache an answer", cause);
      }
    },
  };
};

/** Says nothing a caller could use. The reason goes to the log instead. */
const MISCONFIGURED = { error: "MISCONFIGURED" } as const;

const SERVICE_UNAVAILABLE = 503;

/**
 * server.ts exits when the environment is wrong, because an operator is
 * watching a terminal. A Worker has no terminal and no exit: it answers 503
 * and says why in the log, which is where Cloudflare's tail will find it.
 */
export const createFetchHandler = (
  createGateway: (apiKey: string) => SteamGateway = (apiKey) =>
    createSteamClient({ apiKey }),
) => {
  // One app per isolate. The environment cannot change under a running Worker,
  // so there is nothing to invalidate — and building a Hono app per request
  // would be pure waste.
  let app: Hono | undefined;

  return (request: Request, env: WorkerEnv): Response | Promise<Response> => {
    const config = loadConfig(env);
    if (!config.ok) {
      console.error(`Worker is misconfigured: ${config.error}`);
      return Response.json(MISCONFIGURED, { status: SERVICE_UNAVAILABLE });
    }

    app ??= createApp(
      createGateway(config.value.steamApiKey),
      cacheFrom((globalThis as { caches?: PlatformCaches }).caches),
    );
    return app.fetch(request);
  };
};

/**
 * The Module Worker entry point. server.ts stays exactly as it is: this is a
 * second way in, not a replacement — `pnpm dev:api` is unaffected.
 */
export default { fetch: createFetchHandler() };
