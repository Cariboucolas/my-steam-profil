import type {
  AchievementNamesDto,
  GameDto,
  GameProgressDto,
  GameRarityDto,
  GameTallyDto,
  ProfileDto,
} from "@steam/contracts";
import { err, ok } from "@steam/domain";

import type { ApiClient, ApiError } from "./api-client";
import { createRequestQueue, DROPPED, type Lane } from "./request-queue";

const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const NOT_FOUND = 404;

/**
 * How many requests the app has in flight at once, whatever is being asked and
 * whoever asks. Six is what a client opens to one host anyway, so a larger
 * number would only queue somewhere less visible (ADR-0005).
 */
const REQUESTS_IN_FLIGHT = 6;

/**
 * One queue for every client: `useApiClient` builds a client per component and
 * per SteamId, and a queue per client would be as many budgets as there are
 * clients (#162).
 */
const backendQueue = createRequestQueue(REQUESTS_IN_FLIGHT);

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

  const send = async <T>(url: string, signal: AbortSignal | undefined) => {
    let response: Response;
    try {
      response = await request(url, { signal: signal ?? null });
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

  /**
   * A call nobody waits for any more answers as a backend that did not: the
   * port keeps answering `Result`, and whoever aborted is not reading it.
   */
  const getAt = async <T>(url: string, signal: AbortSignal | undefined, lane: Lane) => {
    const answer = await backendQueue(() => send<T>(url, signal), signal, lane);
    return answer === DROPPED ? err<ApiError>("UNAVAILABLE") : answer;
  };

  /** A question about the configured player. Most of them are. */
  const get = <T>(path: string, signal: AbortSignal | undefined, lane: Lane) =>
    getAt<T>(`${root}${path}`, signal, lane);

  // What a screen waits on goes in the foreground; what is asked once per game
  // to count a library goes behind it.
  return {
    getProfile: (signal) => get<ProfileDto>("", signal, "foreground"),
    getGames: (signal) => get<readonly GameDto[]>("/games", signal, "foreground"),
    getGameProgress: (appId, signal) =>
      get<GameProgressDto>(`/games/${appId}/progress`, signal, "foreground"),
    getGameTally: (appId, signal) =>
      get<GameTallyDto>(`/games/${appId}/completion`, signal, "background"),

    // Off `api` rather than `root`: no steam id in this address, which is what
    // lets the backend answer every player from one cached entry (ADR-0008).
    getGameRarity: (appId, signal) =>
      getAt<GameRarityDto>(`${api}/games/${appId}/rarity`, signal, "background"),

    getAchievementNames: (appId, signal) =>
      getAt<AchievementNamesDto>(`${api}/games/${appId}/achievements`, signal, "background"),
  };
};
