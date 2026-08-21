import { SteamId } from "@steam/domain";

/** Where the backend listens while developing on this machine. */
const LOCAL_BACKEND = "http://localhost:3000";

/**
 * Where calls go. Unlike the steam id, this stays a build-time setting: a
 * deployed bundle talks to the backend it was built against, and a developer
 * who sets nothing talks to their own machine.
 */
export const resolveBaseUrl = (apiUrl: string | undefined): string =>
  apiUrl?.trim() || LOCAL_BACKEND;

/**
 * The profile a fresh install starts on, when the build offers one. It goes
 * through the domain rather than being trusted, so a typo in .env surfaces as
 * the setup screen instead of reaching the backend and coming back as "no such
 * profile" — which would send someone looking in the wrong place.
 */
export const resolveInitialSteamId = (raw: string | undefined): string | undefined => {
  const steamId = SteamId.create(raw?.trim() ?? "");
  return steamId.ok ? steamId.value.value : undefined;
};
