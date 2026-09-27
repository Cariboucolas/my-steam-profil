import { useMemo } from "react";

import { useSteamId } from "../settings/steam-id-store";
import type { ApiClient } from "./api-client";
import { useCreateApiClient } from "./api-client-provider";

/**
 * A client for the profile currently chosen, or nothing while there is none.
 * Made by whatever `ApiClientProvider` sits above, the app's backend by
 * default. Memoised on the steam id: a bare call to the factory in a component
 * would hand the screens a new client on every render and restart their
 * loading.
 */
export const useApiClient = (): ApiClient | undefined => {
  const { state } = useSteamId();
  const create = useCreateApiClient();
  const steamId = state.status === "known" ? state.steamId : undefined;

  return useMemo(
    () => (steamId === undefined ? undefined : create(steamId)),
    [steamId, create],
  );
};
