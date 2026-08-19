import { ok, err, type Result } from "@steam/domain";

/** Where the service listens when the environment says nothing. */
export const DEFAULT_PORT = 3000;

const LOWEST_PORT = 1;
const HIGHEST_PORT = 65535;

export interface ApiConfig {
  readonly steamApiKey: string;
  readonly port: number;
}

export type ConfigError = "MISSING_API_KEY" | "INVALID_PORT";

/**
 * Reads the environment the process was given. Per ADR-0002 this returns a
 * Result rather than throwing: a machine started without a key is an expected
 * outcome of running the process, and that failure has to reach a clean exit
 * message rather than a stack trace.
 */
export const loadConfig = (
  env: Readonly<Record<string, string | undefined>>,
): Result<ApiConfig, ConfigError> => {
  const steamApiKey = env["STEAM_API_KEY"]?.trim() ?? "";
  if (steamApiKey === "") {
    return err("MISSING_API_KEY");
  }

  const rawPort = env["PORT"]?.trim();
  if (rawPort === undefined || rawPort === "") {
    return ok({ steamApiKey, port: DEFAULT_PORT });
  }

  // A misspelled PORT should stop the process, not silently move the service
  // somewhere its operator is not looking.
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < LOWEST_PORT || port > HIGHEST_PORT) {
    return err("INVALID_PORT");
  }

  return ok({ steamApiKey, port });
};
