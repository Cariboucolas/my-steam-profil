import { SteamGatewayError, type SteamGateway } from "./steam-gateway";
import type {
  SteamPlayerSummariesResponse,
  SteamOwnedGamesResponse,
  SteamSchemaResponse,
  SteamPlayerAchievementsResponse,
} from "./steam-types";

const STEAM_BASE_URL = "https://api.steampowered.com";

const BAD_REQUEST = 400;
const FORBIDDEN = 403;

/**
 * The only statuses Steam uses to say something true about a game or a player
 * rather than to report a failure, and only on the two calls listed below: 400
 * for a game that defines no stats, 403 for a private profile. Both carry a
 * body the mapper reads.
 */
const CARRIES_AN_ANSWER = [BAD_REQUEST, FORBIDDEN] as const;

/** Steam localises achievement names; the domain speaks English. */
const LANGUAGE = "english";

export interface SteamClientConfig {
  readonly apiKey: string;
  /** Injectable so the whole backend can be tested without a network. */
  readonly fetch?: typeof fetch;
}



export const createSteamClient = (config: SteamClientConfig): SteamGateway => {
  const request = config.fetch ?? globalThis.fetch;

  /**
   * Error messages name the path, never the URL: the URL carries the API key
   * and these messages end up in logs and, indirectly, in responses.
   */
  const call = async <T>(
    path: string,
    params: Readonly<Record<string, string>>,
    /**
     * Statuses this particular call should read rather than raise on. Empty for
     * most calls: a 4xx there means our key is wrong, and answering with the
     * error body would turn an outage into an empty library.
     */
    carriesAnAnswer: readonly number[] = [],
  ): Promise<T> => {
    const url = new URL(path, STEAM_BASE_URL);
    url.searchParams.set("key", config.apiKey);
    for (const [name, value] of Object.entries(params)) {
      url.searchParams.set(name, value);
    }

    let response: Response;
    try {
      response = await request(url);
    } catch (cause) {
      throw new SteamGatewayError(`Could not reach Steam at ${path}`, undefined, {
        cause,
      });
    }

    if (!response.ok && !carriesAnAnswer.includes(response.status)) {
      throw new SteamGatewayError(
        `Steam answered ${response.status} at ${path}`,
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new SteamGatewayError(
        `Steam answered something that is not JSON at ${path}`,
        response.status,
        { cause },
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
      call<SteamSchemaResponse>(
        "/ISteamUserStats/GetSchemaForGame/v2/",
        { appid: String(appId), l: LANGUAGE },
        CARRIES_AN_ANSWER,
      ),

    /**
     * Steam answers 400 here when the game defines no stats and 403 when the
     * profile is private, both with a body saying which. Those are normal
     * outcomes, so they come back as data for the mapper rather than as errors.
     */
    getPlayerAchievements: (steamId, appId) =>
      call<SteamPlayerAchievementsResponse>(
        "/ISteamUserStats/GetPlayerAchievements/v1/",
        { steamid: steamId, appid: String(appId), l: LANGUAGE },
        CARRIES_AN_ANSWER,
      ),
  };
};
