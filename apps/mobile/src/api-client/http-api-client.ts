import { ok, err } from "@steam/domain";
import type {
  GameDto,
  GameProgressDto,
  GameRarityDto,
  GameTallyDto,
  ProfileDto,
} from "@steam/contracts";

import type { ApiClient, ApiError } from "./api-client";

const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const NOT_FOUND = 404;

export type HttpApiClientConfig = {
  /** Where apps/api is listening. */
  readonly baseUrl: string;
  /** The player this client asks about. */
  readonly steamId: string;
  /** Injectable so the client can be tested without a server. */
  readonly fetch?: typeof fetch;
};

/**
 * Anything the app cannot act on differently reads as unavailable: a 500, a
 * 502, a backend that is down, an answer that is not JSON. The app's job is to
 * say "try again later", not to explain which of those happened.
 */
const failureFor = (status: number): ApiError => {
  switch (status) {
    case NOT_FOUND:
      return "NOT_FOUND";
    case FORBIDDEN:
      return "PRIVATE_PROFILE";
    case BAD_REQUEST:
      return "INVALID_STEAM_ID";
    default:
      return "UNAVAILABLE";
  }
};

/**
 * Talks to apps/api. It knows nothing of Steam: no key, no Steam URL, no Steam
 * response shape — which is the whole point of ADR-0001.
 */
export const createHttpApiClient = (config: HttpApiClientConfig): ApiClient => {
  const request = config.fetch ?? globalThis.fetch;
  const api = `${config.baseUrl.replace(/\/+$/, "")}/api`;
  /** Everything the backend knows about this one player, and nothing else. */
  const root = `${api}/profile/${config.steamId}`;

  const getAt = async <T>(url: string) => {
    let response: Response;
    try {
      response = await request(url);
    } catch {
      return err<ApiError>("UNAVAILABLE");
    }

    if (!response.ok) {
      return err<ApiError>(failureFor(response.status));
    }

    try {
      return ok((await response.json()) as T);
    } catch {
      return err<ApiError>("UNAVAILABLE");
    }
  };

  /** A question about the configured player. Most of them are. */
  const get = <T>(path: string) => getAt<T>(`${root}${path}`);

  return {
    getProfile: () => get<ProfileDto>(""),
    getGames: () => get<readonly GameDto[]>("/games"),
    getGameProgress: (appId) => get<GameProgressDto>(`/games/${appId}/progress`),
    getGameTally: (appId) => get<GameTallyDto>(`/games/${appId}/completion`),

    // Off `api` rather than `root`: no steam id in this address, which is what
    // lets the backend answer every player from one cached entry (ADR-0008).
    getGameRarity: (appId) => getAt<GameRarityDto>(`${api}/games/${appId}/rarity`),
  };
};
