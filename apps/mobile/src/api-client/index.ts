import { err } from "@steam/domain";

import type { ApiClient } from "./api-client";
import { resolveApiConfig } from "./config";
import { createHttpApiClient } from "./http-api-client";

export type { ApiClient, ApiError, ProgressError } from "./api-client";

// Written out rather than looked up: Metro substitutes EXPO_PUBLIC_ variables
// at build time, and only where they appear literally.
const config = resolveApiConfig(
  process.env.EXPO_PUBLIC_API_URL,
  process.env.EXPO_PUBLIC_STEAM_ID,
);

/**
 * Stands in when the app was built without a steam id. It answers the same
 * failure to everything, so screens need no special case for it — an
 * unconfigured build is just another thing that can go wrong.
 */
const unconfigured: ApiClient = {
  getProfile: () => Promise.resolve(err("NOT_CONFIGURED")),
  getGames: () => Promise.resolve(err("NOT_CONFIGURED")),
  getGameProgress: () => Promise.resolve(err("NOT_CONFIGURED")),
};

/**
 * The one place the app decides where its data comes from. It now talks to
 * apps/api; createFixtureApiClient is still here for working offline and for
 * standing in during tests.
 */
export const apiClient: ApiClient = config.ok
  ? createHttpApiClient(config.value)
  : unconfigured;
