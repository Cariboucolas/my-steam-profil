import type { ApiClient } from "./api-client";
import { resolveBaseUrl } from "./config";
import { createHttpApiClient } from "./http-api-client";

export type { ApiClient, ApiError, ProgressError } from "./api-client";

// Written out rather than looked up: Metro substitutes EXPO_PUBLIC_ variables
// at build time, and only where they appear literally.
const baseUrl = resolveBaseUrl(process.env.EXPO_PUBLIC_API_URL);

/**
 * The one place the app decides where its data comes from. The steam id is no
 * longer baked into the bundle: it comes from whoever typed it, so a client
 * exists per profile rather than once per build.
 */
export const createApiClient = (steamId: string): ApiClient =>
  createHttpApiClient({ baseUrl, steamId });
