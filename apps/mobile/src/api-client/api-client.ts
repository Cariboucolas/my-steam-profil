import type { Result } from "@steam/domain";
import type {
  AchievementNamesDto,
  GameDto,
  GameProgressDto,
  GameRarityDto,
  GameTallyDto,
  ProfileDto,
} from "@steam/contracts";

/** Failures every call can meet. */
export type ApiError =
  /** No such profile, or no such game. */
  | "NOT_FOUND"
  /** Steam will not answer for this player. */
  | "PRIVATE_PROFILE"
  /** The backend refused the steam id it was asked about. */
  | "INVALID_STEAM_ID"
  /** Steam or the backend is down. */
  | "UNAVAILABLE";

/**
 * Progress has one failure of its own: the game is in the library, but its
 * achievements were never fetched. The list shows those as "—" rather than
 * as an error, because one call per game is not something to run 367 times.
 */
export type ProgressError = ApiError | "NOT_LOADED";

/**
 * The one seam between the screens and their data. Today a fixture reader,
 * tomorrow an HTTP client against apps/api — the screens never know which.
 */
export interface ApiClient {
  getProfile(): Promise<Result<ProfileDto, ApiError>>;
  getGames(): Promise<Result<readonly GameDto[], ApiError>>;
  getGameProgress(appId: number): Promise<Result<GameProgressDto, ProgressError>>;
  /**
   * How far the player has got in one game, and when they got there. The
   * library asks this once per game it owns, so it is deliberately the cheapest
   * question the app can ask — the backend answers it with a single Steam call
   * (ADR-0005), and the unlock dates ride along on it (ADR-0006).
   */
  getGameTally(appId: number): Promise<Result<GameTallyDto, ProgressError>>;
  /**
   * What share of a game's owners holds each of its achievements, as Steam
   * publishes it. The only question here that is not about the configured
   * player: every player gets the same answer, and the backend caches it under
   * an address that names none of them (ADR-0008).
   *
   * A game Steam publishes nothing about answers with an empty list, which is a
   * real answer and not a failure.
   */
  getGameRarity(appId: number): Promise<Result<GameRarityDto, ApiError>>;
  /**
   * What a game calls each of its achievements, and the icon it draws them
   * with. The other question that is not about the configured player: a name is
   * the game's, not the asker's, so the backend keeps this under an address
   * naming nobody either (ADR-0008).
   *
   * Asked only for the handful of games carrying the rows a ranking actually
   * shows. Behind it is the schema, the heavy payload ADR-0005 keeps out of the
   * library's path — three to six calls, never one per game owned.
   *
   * A game that defines no achievements answers with an empty list, which is a
   * real answer and not a failure.
   */
  getAchievementNames(appId: number): Promise<Result<AchievementNamesDto, ApiError>>;
}
