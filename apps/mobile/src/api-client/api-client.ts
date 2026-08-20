import type { Result } from "@steam/domain";
import type { GameDto, GameProgressDto, ProfileDto } from "@steam/contracts";

/** Failures every call can meet. */
export type ApiError =
  /** No such profile, or no such game. */
  | "NOT_FOUND"
  /** Steam will not answer for this player. */
  | "PRIVATE_PROFILE"
  /** The backend refused the steam id this app was configured with. */
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
}
