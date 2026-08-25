import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { SteamId } from "@steam/domain";

import type { GameCompletionDto, GameProgressDto } from "@steam/contracts";

import { SteamGatewayError, type SteamGateway } from "../steam/steam-gateway";
import {
  mapProfile,
  mapGames,
  mapGameProgress,
  mapGameCompletion,
  type AchievementsError,
} from "../steam/steam-mapper";
import {
  toProfileDto,
  toGameDto,
  toGameCompletionDto,
  toGameProgressDto,
  emptyGameCompletionDto,
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

type GameHandler = (
  context: Context,
  steamId: SteamId,
  appId: number,
) => Promise<Response>;

/**
 * The guard for a route about one game: both identifiers are checked before a
 * handler runs, so neither bad steam id nor bad app id costs a Steam call.
 */
const withGame = (handle: GameHandler) =>
  withSteamId((context, steamId) => {
    const appId = parseAppId(context.req.param("appId") ?? "");
    return appId === null
      ? Promise.resolve(context.json({ error: "INVALID_APP_ID" }, BAD_REQUEST))
      : handle(context, steamId, appId);
  });

/**
 * The two ways Steam refuses to tally a game, answered the same way by every
 * route that asks: a private profile is a refusal the caller must see, and a
 * game with nothing to earn is a normal answer shaped like a full one, so no
 * screen needs a special case.
 *
 * Listed rather than defaulted: a new failure should break the build here, not
 * quietly become a successful empty answer.
 */
const answerRefusal = (
  context: Context,
  refusal: AchievementsError,
  emptyAnswer: GameCompletionDto | GameProgressDto,
): Response => {
  switch (refusal) {
    case "PRIVATE_PROFILE":
      return context.json({ error: "PRIVATE_PROFILE" }, FORBIDDEN);
    case "NO_ACHIEVEMENTS":
      return context.json(emptyAnswer);
  }
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
  withGame(async (context, steamId, appId) => {
    // What a game asks of you, and what this player has done: two calls, and
    // neither is meaningful without the other.
    const [schema, player] = await Promise.all([
      gateway.getSchemaForGame(appId),
      gateway.getPlayerAchievements(steamId.value, appId),
    ]);

    const progress = mapGameProgress(schema, player);
    return progress.ok
      ? context.json(toGameProgressDto(progress.value))
      : answerRefusal(context, progress.error, emptyGameProgressDto());
  });

/**
 * How far a player has got in one game, and nothing else. The library asks this
 * for every game it owns, so it is deliberately the cheapest answer the service
 * can give: one Steam call, and the smaller of the two payloads (ADR-0005).
 */
const serveGameCompletion = (
  gateway: SteamGateway,
): ((c: Context) => Promise<Response>) =>
  withGame(async (context, steamId, appId) => {
    const player = await gateway.getPlayerAchievements(steamId.value, appId);

    const completion = mapGameCompletion(player);
    return completion.ok
      ? context.json(toGameCompletionDto(completion.value))
      : answerRefusal(context, completion.error, emptyGameCompletionDto());
  });

/**
 * Builds the API around a way out to Steam. It takes the gateway rather than
 * reading the environment itself, so a test can build a fully working app
 * without any configuration.
 */
export const createApp = (gateway: SteamGateway): Hono => {
  const app = new Hono();

  /**
   * The app runs in a browser on another port while it is being built, and a
   * browser discards an answer that does not say it may read it.
   *
   * This is a permission, not a protection. The service has no authentication,
   * so anything that is not a browser reaches it regardless; narrowing the
   * origin would not change that.
   */
  app.use("/api/*", cors());

  app.get("/health", (context) => context.json({ status: "ok" }));
  app.get("/api/profile/:steamId", serveProfile(gateway));
  app.get("/api/profile/:steamId/games", serveGames(gateway));
  app.get(
    "/api/profile/:steamId/games/:appId/progress",
    serveGameProgress(gateway),
  );
  app.get(
    "/api/profile/:steamId/games/:appId/completion",
    serveGameCompletion(gateway),
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
