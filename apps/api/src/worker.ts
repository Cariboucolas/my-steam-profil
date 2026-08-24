import type { Hono } from "hono";

import { createApp } from "./http/app";
import { loadConfig } from "./http/config";
import { createSteamClient } from "./steam/steam-client";
import type { SteamGateway } from "./steam/steam-gateway";

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

    app ??= createApp(createGateway(config.value.steamApiKey));
    return app.fetch(request);
  };
};

/**
 * The Module Worker entry point. server.ts stays exactly as it is: this is a
 * second way in, not a replacement — `pnpm dev:api` is unaffected.
 */
export default { fetch: createFetchHandler() };
