import type { ProgressError } from "../api-client";

/**
 * One sentence per failure, written for whoever is looking at the screen. The
 * distinctions matter: "Steam has never heard of this player" and "this profile
 * is private" would otherwise look like the same dead end.
 */
const MESSAGES: Readonly<Record<ProgressError, string>> = {
  INVALID_STEAM_ID: "The backend refused this Steam ID. Try a different profile.",
  NOT_FOUND: "Steam has no profile with that ID.",
  PRIVATE_PROFILE:
    "This profile is private, so Steam will not say what has been unlocked.",
  NOT_LOADED: "Achievements have not been loaded for this game yet.",
  UNAVAILABLE:
    "Could not reach the backend. Check that it is running, then try again.",
};

export const messageFor = (error: ProgressError): string => MESSAGES[error];
