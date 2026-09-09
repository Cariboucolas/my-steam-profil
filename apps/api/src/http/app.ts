import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { SteamId } from "@steam/domain";

import type { GameProgressDto, GameTallyDto } from "@steam/contracts";

import { SteamGatewayError, type SteamGateway } from "../steam/steam-gateway";
import {
  mapProfile,
  mapGames,
  mapGameProgress,
  mapGameTally,
  mapGameRarity,
  mapAchievementNames,
  type AchievementsError,
} from "../steam/steam-mapper";
import {
  toProfileDto,
  toGameDto,
  toGameProgressDto,
  toGameTallyDto,
  toGameRarityDto,
  toAchievementNamesDto,
  emptyGameProgressDto,
  emptyGameTallyDto,
} from "./presenters";
import { cached, noCache, type ResponseCache } from "./cache";

const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const INTERNAL_SERVER_ERROR = 500;
const BAD_GATEWAY = 502;

/** Every reason a steam id can be rejected reads the same to a caller. */
const INVALID_STEAM_ID = { error: "INVALID_STEAM_ID" } as const;

const INVALID_APP_ID = { error: "INVALID_APP_ID" } as const;

/**
 * Five minutes. Long enough to cover the burst of one library open — one
 * request per game the player has ever launched — and short enough that
 * backing out of a game and looking again usually shows a fresh tally.
 *
 * A guess, not a measurement: there is no usage to measure yet (ADR-0005). It
 * belongs to this one route: what a tally is worth after five minutes says
 * nothing about any other answer the API gives.
 */
export const TALLY_CACHE_SECONDS = 300;

/**
 * Twenty-four hours — 288 times the tally's five minutes, and deliberately so.
 *
 * A Rarity is a share of every owner of a Game, so it moves at the speed of a
 * player base rather than of a player: an unlock that would change it visibly
 * would have to be a great many unlocks. Nothing a player does to their own
 * library can make this answer wrong, which is what separates it from the
 * tally, where a fresh unlock is the whole point (ADR-0008).
 */
export const RARITY_CACHE_SECONDS = 86_400;

/**
 * Twenty-four hours, the same day a Rarity is kept for and for the same reason
 * (ADR-0008): how a Game names its Achievements belongs to the Game, and a game
 * renames one about as often as a player base moves a published share.
 *
 * Written as its own constant rather than shared with the rarity route, because
 * what one answer is worth after a day says nothing about the other — which is
 * the whole point of a route stating its own lifetime.
 */
export const ACHIEVEMENT_NAMES_CACHE_SECONDS = 86_400;

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
 * The guard for a route about a game and no player: bad input costs nothing and
 * cannot be aimed at Steam. There is no steam id in the address to check, which
 * is the whole point of such a route (ADR-0008).
 */
const withApp =
  (handle: (context: Context, appId: number) => Promise<Response>) =>
  (context: Context): Promise<Response> => {
    const appId = parseAppId(context.req.param("appId") ?? "");
    return appId === null
      ? Promise.resolve(context.json(INVALID_APP_ID, BAD_REQUEST))
      : handle(context, appId);
  };

/**
 * The guard for a route about one game *and* one player: the steam id first, so
 * a malformed one is refused as such rather than as a bad app id, then the same
 * app id check every game route makes.
 */
const withGame = (handle: GameHandler) =>
  withSteamId((context, steamId) =>
    withApp((forGame, appId) => handle(forGame, steamId, appId))(context),
  );

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
  emptyAnswer: GameProgressDto | GameTallyDto,
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
 * How far a player has got in one game, and when. The library asks this for
 * every game it owns, so it is deliberately the cheapest answer the service can
 * give: one Steam call, and the smaller of the two payloads (ADR-0005). The
 * unlock dates come out of that same response, so they cost no call of their
 * own (ADR-0006).
 */
const serveGameTally = (
  gateway: SteamGateway,
): ((c: Context) => Promise<Response>) =>
  withGame(async (context, steamId, appId) => {
    const player = await gateway.getPlayerAchievements(steamId.value, appId);

    const tally = mapGameTally(player);
    return tally.ok
      ? context.json(toGameTallyDto(tally.value))
      : answerRefusal(context, tally.error, emptyGameTallyDto());
  });

/**
 * What share of a game's owners holds each of its achievements. One Steam call,
 * no API key, and no player: this answer is the same for everyone who asks,
 * which is what lets it be kept for a day under a key every player shares
 * (ADR-0008).
 *
 * A game Steam publishes nothing about answers with an empty list. That is the
 * true thing to say — a list of zeroes would claim every achievement in it is
 * the rarest the player owns.
 */
const serveGameRarity = (
  gateway: SteamGateway,
): ((c: Context) => Promise<Response>) =>
  withApp(async (context, appId) => {
    const published = await gateway.getGlobalAchievementPercentages(appId);
    return context.json(toGameRarityDto(mapGameRarity(published)));
  });

/**
 * How a Game names its own Achievements: what a row shows, for the handful of
 * games that carry the rows actually shown. One Steam call, no player, and the
 * heaviest payload the service fetches — which is exactly why it is asked for
 * three to six games rather than for a whole library (ADR-0005), and why the
 * answer is worth keeping for a day under an address every player shares
 * (ADR-0008).
 *
 * A game that defines no achievements answers with an empty list: a true thing
 * to say about a real game, and nothing a ranking could have a row from.
 */
const serveAchievementNames = (
  gateway: SteamGateway,
): ((c: Context) => Promise<Response>) =>
  withApp(async (context, appId) => {
    const schema = await gateway.getSchemaForGame(appId);
    return context.json(toAchievementNamesDto(mapAchievementNames(schema)));
  });

/**
 * Builds the API around a way out to Steam, and somewhere to keep the answers
 * worth keeping. Both are parameters rather than things it reaches for, so a
 * test can build a fully working app without any configuration, and the cache
 * defaults to one that remembers nothing.
 */
export const createApp = (
  gateway: SteamGateway,
  cache: ResponseCache = noCache,
): Hono => {
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
  /**
   * The one cached route. The library asks it once per game it owns, and a
   * tally five minutes stale is invisible in a column of numbers — where the
   * progress route above must stay live, because opening a game is when a
   * player checks that a fresh unlock registered (ADR-0005).
   */
  app.get(
    "/api/profile/:steamId/games/:appId/completion",
    cached(cache, TALLY_CACHE_SECONDS, serveGameTally(gateway)),
  );
  /**
   * No steam id in this address, on purpose. Cache keys are request URLs, so
   * leaving the player out of the address is the entire mechanism by which two
   * players share one answer — there is nothing else to build (ADR-0008).
   */
  app.get(
    "/api/games/:appId/rarity",
    cached(cache, RARITY_CACHE_SECONDS, serveGameRarity(gateway)),
  );
  /**
   * The second address that names no player, on the same reasoning: what a Game
   * calls its Achievements is the Game's, not the asker's (ADR-0008).
   */
  app.get(
    "/api/games/:appId/achievements",
    cached(cache, ACHIEVEMENT_NAMES_CACHE_SECONDS, serveAchievementNames(gateway)),
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
