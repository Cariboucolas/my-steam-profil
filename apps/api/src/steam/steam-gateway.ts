import type {
  SteamPlayerSummariesResponse,
  SteamOwnedGamesResponse,
  SteamSchemaResponse,
  SteamPlayerAchievementsResponse,
} from "./steam-types";

/**
 * The way out to the Steam Web API. Routes depend on this interface rather than
 * on the HTTP client, which is what makes ADR-0001's boundary real: Steam can
 * be swapped or stubbed without a route knowing.
 *
 * Methods answer with Steam's own shapes; turning those into the domain is the
 * mapper's job.
 */
export interface SteamGateway {
  getPlayerSummaries(steamId: string): Promise<SteamPlayerSummariesResponse>;
  getOwnedGames(steamId: string): Promise<SteamOwnedGamesResponse>;
  getSchemaForGame(appId: number): Promise<SteamSchemaResponse>;
  getPlayerAchievements(
    steamId: string,
    appId: number,
  ): Promise<SteamPlayerAchievementsResponse>;
}

/**
 * Steam could not be reached, or answered in a way that says nothing about the
 * player: a network failure, a rate limit, a server error. This is the only
 * signal that becomes a 502; every other failure is a normal outcome the mapper
 * describes.
 */
export class SteamGatewayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SteamGatewayError";
  }
}
