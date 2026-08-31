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
const INTERNAL_SERVER_ERROR = 500;

/**
 * The only statuses Steam uses to say something true about a game or a player
 * rather than to report a failure, and only on the two calls listed below: 400
 * for a game that defines no stats, 403 for a private profile. Both carry a
 * body the mapper reads.
 */
const CARRIES_AN_ANSWER = [BAD_REQUEST, FORBIDDEN] as const;

/**
 * The player call says "this app keeps no stats" with a 400 for most games and
 * with a 500 for a few of them. Measured on appId 24400, which answers 500 five
 * times out of five and whose schema declares no achievements at all: the
 * status is a standing property of the game, not Steam having a bad minute.
 *
 * Scoped to this one call. A 500 on the library or the schema is Steam being
 * down, and reading it would turn an outage into a library of games that appear
 * to have nothing to earn. What keeps a real outage out even here is the body:
 * Steam answers with its own envelope and fails with an HTML page, and a page
 * is not JSON, so it raises below rather than reaching the mapper.
 */
const CARRIES_A_PLAYER_ANSWER = [
  ...CARRIES_AN_ANSWER,
  INTERNAL_SERVER_ERROR,
] as const;

/** Steam localises achievement names; the domain speaks English. */
const LANGUAGE = "english";

/**
 * What a failure names: the path, and what was being asked about.
 *
 * A library open makes one call per game the player has ever launched, so a
 * message that says only "Steam answered 500" leaves an operator with nothing
 * to go on — not which game, not which player, not whether one call failed or
 * all of them. Every parameter is safe to print: the key is set on the URL
 * below and never travels in `params`.
 */
const asking = (
  path: string,
  params: Readonly<Record<string, string>>,
): string => {
  const named = Object.entries(params)
    .map(([name, value]) => `${name}=${value}`)
    .join(", ");
  return named === "" ? path : `${path} (${named})`;
};

export interface SteamClientConfig {
  readonly apiKey: string;
  /** Injectable so the whole backend can be tested without a network. */
  readonly fetch?: typeof fetch;
}



export const createSteamClient = (config: SteamClientConfig): SteamGateway => {
  const request = config.fetch ?? globalThis.fetch;

  /**
   * Error messages name the path and what was asked, never the URL: only the
   * URL carries the API key, and these messages end up in logs and, indirectly,
   * in responses.
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
      throw new SteamGatewayError(`Could not reach Steam at ${asking(path, params)}`, undefined, {
        cause,
      });
    }

    if (!response.ok && !carriesAnAnswer.includes(response.status)) {
      throw new SteamGatewayError(
        `Steam answered ${response.status} at ${asking(path, params)}`,
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new SteamGatewayError(
        `Steam answered something that is not JSON at ${asking(path, params)}`,
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
        CARRIES_A_PLAYER_ANSWER,
      ),
  };
};
