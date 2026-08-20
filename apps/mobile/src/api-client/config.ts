import { SteamId, ok, err, type Result } from "@steam/domain";

/** Where the backend listens while developing on this machine. */
const LOCAL_BACKEND = "http://localhost:3000";

export type ApiConfig = {
  readonly baseUrl: string;
  readonly steamId: string;
};

/**
 * Reads the two settings the app needs. The steam id goes through the domain
 * rather than being trusted, so a typo in the environment surfaces as "not
 * configured" instead of reaching the backend and coming back as "no such
 * profile" — which would send someone looking in the wrong place.
 */
export const resolveApiConfig = (
  apiUrl: string | undefined,
  rawSteamId: string | undefined,
): Result<ApiConfig, "NOT_CONFIGURED"> => {
  const steamId = SteamId.create(rawSteamId?.trim() ?? "");
  if (!steamId.ok) {
    return err("NOT_CONFIGURED");
  }
  return ok({
    baseUrl: apiUrl?.trim() || LOCAL_BACKEND,
    steamId: steamId.value.value,
  });
};
