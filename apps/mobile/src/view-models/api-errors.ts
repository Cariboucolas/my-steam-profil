import type { ProgressError } from "../api-client";
import type { Translate } from "../i18n/i18n";

/**
 * A failure a screen can put in words: the API's own, plus the two a game
 * screen finds out for itself. The screen keeps the code rather than the
 * sentence, so a change of language rewrites the sentence it is showing.
 */
export type ScreenError = ProgressError | "INVALID_GAME_ID" | "NOT_IN_LIBRARY";

/**
 * One sentence per failure, written for whoever is looking at the screen. The
 * distinctions matter: "Steam has never heard of this player" and "this profile
 * is private" would otherwise look like the same dead end.
 */
export const messageFor = (error: ScreenError, t: Translate): string => t(`errors.${error}`);
