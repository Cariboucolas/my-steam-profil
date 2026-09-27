import type { Decorator } from "@storybook/react-native-web-vite";

import { ApiClientProvider, type CreateApiClient } from "../api-client/api-client-provider";
import type { SteamIdStorage } from "../settings/steam-id-storage";
import { SteamIdProvider } from "../settings/steam-id-store";
import { FIXTURE_PROFILE } from "./profile";

/** A device that remembers `stored`, or nothing, and forgets nothing it is told. */
const remembering = (stored: string | undefined): SteamIdStorage => ({
  read: () => Promise.resolve(stored),
  write: () => Promise.resolve(),
  forget: () => Promise.resolve(),
});

/**
 * Serves a page as the app would, minus the router and the network: the device
 * knows a profile, and every client the page asks for comes from `create`
 * (ADR-0022). Called at module scope, so the storage and the factory keep one
 * identity for as long as the story is shown.
 *
 * `stored` is null for a device that remembers no profile. Null rather than
 * undefined, which would quietly take the default and remember one.
 */
export const servedBy = (
  create: CreateApiClient,
  stored: string | null = FIXTURE_PROFILE.steamId,
): Decorator => {
  const storage = remembering(stored ?? undefined);
  return (Story) => (
    <SteamIdProvider storage={storage}>
      <ApiClientProvider create={create}>
        <Story />
      </ApiClientProvider>
    </SteamIdProvider>
  );
};
