import { Hono } from "hono";
import { SteamId } from "@steam/domain";

import type { SteamGateway } from "../steam/steam-gateway";
import { mapProfile } from "../steam/steam-mapper";
import { toProfileDto } from "./presenters";

const BAD_REQUEST = 400;
const NOT_FOUND = 404;

/**
 * Builds the API around a way out to Steam. It takes the gateway rather than
 * reading the environment itself, so a test can build a fully working app
 * without any configuration.
 */
export const createApp = (gateway: SteamGateway): Hono => {
  const app = new Hono();

  app.get("/health", (context) => context.json({ status: "ok" }));

  app.get("/api/profile/:steamId", async (context) => {
    // Validated before any network call: bad input costs nothing and cannot be
    // turned into traffic against Steam.
    const steamId = SteamId.create(context.req.param("steamId"));
    if (!steamId.ok) {
      return context.json({ error: "INVALID_STEAM_ID" }, BAD_REQUEST);
    }

    const raw = await gateway.getPlayerSummaries(steamId.value.value);
    const profile = mapProfile(raw);
    if (!profile.ok) {
      return context.json({ error: "NOT_FOUND" }, NOT_FOUND);
    }

    return context.json(toProfileDto(profile.value));
  });

  return app;
};
