import type { ProgressError } from "../api-client";

/**
 * One sentence per failure, written for whoever is looking at the screen. The
 * distinctions matter: "we have no id to ask about" and "Steam has never heard
 * of this player" would otherwise look like the same dead end.
 */
const MESSAGES: Readonly<Record<ProgressError, string>> = {
  // Says what a valid value looks like: the usual mistake is putting the backend
  // URL here, and the resulting screen looks like the backend is unreachable.
  NOT_CONFIGURED:
    "No Steam profile to show. Set EXPO_PUBLIC_STEAM_ID to a SteamID64 — 17 digits — then restart the dev server.",
  INVALID_STEAM_ID:
    "The backend refused this Steam ID. Check EXPO_PUBLIC_STEAM_ID.",
  NOT_FOUND: "Steam has no profile with that ID.",
  PRIVATE_PROFILE:
    "This profile is private, so Steam will not say what has been unlocked.",
  NOT_LOADED: "Achievements have not been loaded for this game yet.",
  UNAVAILABLE:
    "Could not reach the backend. Check that it is running, then try again.",
};

export const messageFor = (error: ProgressError): string => MESSAGES[error];
