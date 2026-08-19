import { Hono, type Context } from "hono";
import { SteamId } from "@steam/domain";

import { SteamGatewayError, type SteamGateway } from "../steam/steam-gateway";
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
const INTERNAL_SERVER_ERROR = 500;
const BAD_GATEWAY = 502;

/** Every reason a steam id can be rejected reads the same to a caller. */
const INVALID_STEAM_ID = { error: "INVALID_STEAM_ID" } as const;

type Handler = (context: Context, steamId: SteamId) => Promise<Response>;

/**
 * Validates the steam id in the path before a handler runs, so bad input costs
 * nothing and cannot be aimed at Steam. Handlers receive the value object and
 * never have to unwrap a Result themselves.
 */
const withSteamId =
  (handle: Handler) =>
  (context: Context): Promise<Response> => {
    // A missing param reads as an empty id, which the domain already refuses.
    const steamId = SteamId.create(context.req.param("steamId") ?? "");
    return steamId.ok
      ? handle(context, steamId.value)
      : Promise.resolve(context.json(INVALID_STEAM_ID, BAD_REQUEST));
  };

/** An appId is a Steam app id: a whole number above zero, nothing else. */
const parseAppId = (raw: string): number | null => {
  const appId = Number(raw);
  return Number.isInteger(appId) && appId > 0 ? appId : null;
};

const serveProfile = (gateway: SteamGateway): ((c: Context) => Promise<Response>) =>
  withSteamId(async (context, steamId) => {
    const profile = mapProfile(await gateway.getPlayerSummaries(steamId.value));
    if (profile.ok) {
      return context.json(toProfileDto(profile.value));
    }
    if (profile.error === "NOT_FOUND") {
      return context.json({ error: "NOT_FOUND" }, NOT_FOUND);
    }
    // Steam echoed an id the domain refuses. That is Steam misbehaving, not a
    // player who does not exist, and it should not send the caller looking in
    // the wrong place.
    throw new SteamGatewayError("Steam answered with an unusable steam id");
  });

const serveGames = (gateway: SteamGateway): ((c: Context) => Promise<Response>) =>
  withSteamId(async (context, steamId) => {
    // An account that owns nothing is an empty library, not a failure.
    const games = mapGames(await gateway.getOwnedGames(steamId.value));
    return context.json(games.map(toGameDto));
  });

const serveGameProgress = (
  gateway: SteamGateway,
): ((c: Context) => Promise<Response>) =>
  withSteamId(async (context, steamId) => {
    const appId = parseAppId(context.req.param("appId") ?? "");
    if (appId === null) {
      return context.json({ error: "INVALID_APP_ID" }, BAD_REQUEST);
    }

    // What a game asks of you, and what this player has done: two calls, and
    // neither is meaningful without the other.
    const [schema, player] = await Promise.all([
      gateway.getSchemaForGame(appId),
      gateway.getPlayerAchievements(steamId.value, appId),
    ]);

    const progress = mapGameProgress(schema, player);
    if (progress.ok) {
      return context.json(toGameProgressDto(progress.value));
    }
    // Listed rather than defaulted: a new failure should break the build here,
    // not quietly become a successful empty answer.
    switch (progress.error) {
      case "PRIVATE_PROFILE":
        return context.json({ error: "PRIVATE_PROFILE" }, FORBIDDEN);
      case "NO_ACHIEVEMENTS":
        // A game with nothing to earn is a normal answer, shaped like any other.
        return context.json(emptyGameProgressDto());
    }
  });

/**
 * Builds the API around a way out to Steam. It takes the gateway rather than
 * reading the environment itself, so a test can build a fully working app
 * without any configuration.
 */
export const createApp = (gateway: SteamGateway): Hono => {
  const app = new Hono();

  app.get("/health", (context) => context.json({ status: "ok" }));
  app.get("/api/profile/:steamId", serveProfile(gateway));
  app.get("/api/profile/:steamId/games", serveGames(gateway));
  app.get(
    "/api/profile/:steamId/games/:appId/achievements",
    serveGameProgress(gateway),
  );

  /**
   * Two failures, told apart on purpose: Steam let us down, or we did. Bodies
   * carry a name and nothing else — no message, no stack — so neither the API
   * key nor our internals can reach a caller. The cause is logged instead,
   * where only an operator sees it.
   */
  app.onError((error, context) => {
    console.error(error);
    return error instanceof SteamGatewayError
      ? context.json({ error: "STEAM_UNAVAILABLE" }, BAD_GATEWAY)
      : context.json({ error: "INTERNAL_ERROR" }, INTERNAL_SERVER_ERROR);
  });

  return app;
};
