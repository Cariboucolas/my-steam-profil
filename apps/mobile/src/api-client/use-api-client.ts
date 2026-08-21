import { useMemo } from "react";

import { useSteamId } from "../settings/steam-id-store";
import type { ApiClient } from "./api-client";
import { createApiClient } from "./index";

/**
 * A client for the profile currently chosen, or nothing while there is none.
 * Memoised on the steam id: a bare createApiClient call in a component would
 * hand the screens a new client on every render and restart their loading.
 */
export const useApiClient = (): ApiClient | undefined => {
  const { state } = useSteamId();
  const steamId = state.status === "known" ? state.steamId : undefined;

  return useMemo(
    () => (steamId === undefined ? undefined : createApiClient(steamId)),
    [steamId],
  );
};
