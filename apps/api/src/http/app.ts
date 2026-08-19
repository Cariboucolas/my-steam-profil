import { Hono } from "hono";

import type { SteamGateway } from "../steam/steam-gateway";

/**
 * Builds the API around a way out to Steam. It takes the gateway rather than
 * reading the environment itself, so a test can build a fully working app
 * without any configuration.
 */
export const createApp = (gateway: SteamGateway): Hono => {
  const app = new Hono();
  void gateway;

  app.get("/health", (context) => context.json({ status: "ok" }));

  return app;
};
