import { Hono } from "hono";
import { SteamId } from "@steam/domain";

import type { SteamGateway } from "../steam/steam-gateway";
import { mapProfile, mapGames, mapGameProgress } from "../steam/steam-mapper";
import {
  toProfileDto,
  toGameDto,
  toGameProgressDto,
  emptyGameProgressDto,
} from "./presenters";

const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const NOT_FOUND = 404;

/** Every reason a steam id can be rejected reads the same to a caller. */
const INVALID_STEAM_ID = { error: "INVALID_STEAM_ID" } as const;

/** An appId is a Steam app id: a whole number above zero, nothing else. */
const parseAppId = (raw: string): number | null => {
  const appId = Number(raw);
  return Number.isInteger(appId) && appId > 0 ? appId : null;
};

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
      return context.json(INVALID_STEAM_ID, BAD_REQUEST);
    }

    const profile = mapProfile(
      await gateway.getPlayerSummaries(steamId.value.value),
    );
    if (!profile.ok) {
      return context.json({ error: "NOT_FOUND" }, NOT_FOUND);
    }

    return context.json(toProfileDto(profile.value));
  });

  app.get("/api/profile/:steamId/games", async (context) => {
    const steamId = SteamId.create(context.req.param("steamId"));
    if (!steamId.ok) {
      return context.json(INVALID_STEAM_ID, BAD_REQUEST);
    }

    // An account that owns nothing is an empty library, not a failure.
    const games = mapGames(await gateway.getOwnedGames(steamId.value.value));

    return context.json(games.map(toGameDto));
  });

  app.get("/api/profile/:steamId/games/:appId/achievements", async (context) => {
    const steamId = SteamId.create(context.req.param("steamId"));
    if (!steamId.ok) {
      return context.json(INVALID_STEAM_ID, BAD_REQUEST);
    }

    const appId = parseAppId(context.req.param("appId"));
    if (appId === null) {
      return context.json({ error: "INVALID_APP_ID" }, BAD_REQUEST);
    }

    // What a game asks of you, and what this player has done: two calls, and
    // neither is meaningful without the other.
    const [schema, player] = await Promise.all([
      gateway.getSchemaForGame(appId),
      gateway.getPlayerAchievements(steamId.value.value, appId),
    ]);

    const progress = mapGameProgress(schema, player);
    if (progress.ok) {
      return context.json(toGameProgressDto(progress.value));
    }
    if (progress.error === "PRIVATE_PROFILE") {
      return context.json({ error: "PRIVATE_PROFILE" }, FORBIDDEN);
    }

    // A game with nothing to earn is a normal answer, shaped like any other.
    return context.json(emptyGameProgressDto());
  });

  return app;
};
