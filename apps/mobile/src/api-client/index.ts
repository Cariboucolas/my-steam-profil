import { fixtures } from "../fixtures";
import { createFixtureApiClient } from "./fixture-api-client";

export type { ApiClient, ApiError, ProgressError } from "./api-client";

/**
 * The one place the app decides where its data comes from. Swapping this for
 * an HTTP client against apps/api is the whole of that migration.
 */
export const apiClient = createFixtureApiClient(fixtures);
