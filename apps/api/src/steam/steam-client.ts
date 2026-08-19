import { SteamGatewayError, type SteamGateway } from "./steam-gateway";
import type {
  SteamPlayerSummariesResponse,
  SteamOwnedGamesResponse,
  SteamSchemaResponse,
  SteamPlayerAchievementsResponse,
} from "./steam-types";

const DEFAULT_BASE_URL = "https://api.steampowered.com";

const TOO_MANY_REQUESTS = 429;
const SERVER_ERROR_FLOOR = 500;

/** Steam localises achievement names; the domain speaks English. */
const LANGUAGE = "english";

export interface SteamClientConfig {
  readonly apiKey: string;
  /** Injectable so the whole backend can be tested without a network. */
  readonly fetch?: typeof fetch;
  readonly baseUrl?: string;
}

/**
 * Only a failure that says nothing about the player. Steam also answers 400 and
 * 403 with bodies the mapper reads — see the note on getPlayerAchievements.
 */
const saysNothingAboutThePlayer = (status: number): boolean =>
  status === TOO_MANY_REQUESTS || status >= SERVER_ERROR_FLOOR;

export const createSteamClient = (config: SteamClientConfig): SteamGateway => {
  const request = config.fetch ?? globalThis.fetch;
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  /**
   * Error messages name the path, never the URL: the URL carries the API key
   * and these messages end up in logs and, indirectly, in responses.
   */
  const call = async <T>(
    path: string,
    params: Readonly<Record<string, string>>,
  ): Promise<T> => {
    const url = new URL(path, baseUrl);
    url.searchParams.set("key", config.apiKey);
    for (const [name, value] of Object.entries(params)) {
      url.searchParams.set(name, value);
    }

    let response: Response;
    try {
      response = await request(url);
    } catch {
      throw new SteamGatewayError(`Could not reach Steam at ${path}`);
    }

    if (saysNothingAboutThePlayer(response.status)) {
      throw new SteamGatewayError(
        `Steam answered ${response.status} at ${path}`,
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new SteamGatewayError(
        `Steam answered something that is not JSON at ${path}`,
        response.status,
      );
    }
  };

  return {
    getPlayerSummaries: (steamId) =>
      call<SteamPlayerSummariesResponse>("/ISteamUser/GetPlayerSummaries/v2/", {
        steamids: steamId,
      }),

    getOwnedGames: (steamId) =>
      call<SteamOwnedGamesResponse>("/IPlayerService/GetOwnedGames/v1/", {
        steamid: steamId,
        // Without this the answer carries app ids and nothing else.
        include_appinfo: "1",
        // Steam leaves free-to-play titles out by default, even ones the player
        // has put hours into. They are part of the library as a player sees it.
        include_played_free_games: "1",
        format: "json",
      }),

    getSchemaForGame: (appId) =>
      call<SteamSchemaResponse>("/ISteamUserStats/GetSchemaForGame/v2/", {
        appid: String(appId),
        l: LANGUAGE,
      }),

    /**
     * Steam answers 400 here when the game defines no stats and 403 when the
     * profile is private, both with a body saying which. Those are normal
     * outcomes, so they come back as data for the mapper rather than as errors.
     */
    getPlayerAchievements: (steamId, appId) =>
      call<SteamPlayerAchievementsResponse>(
        "/ISteamUserStats/GetPlayerAchievements/v1/",
        { steamid: steamId, appid: String(appId), l: LANGUAGE },
      ),
  };
};
