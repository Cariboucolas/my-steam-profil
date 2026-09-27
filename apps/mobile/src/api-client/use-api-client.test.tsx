import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { SteamIdStorage } from "../settings/steam-id-storage";
import { SteamIdProvider } from "../settings/steam-id-store";
import type { ApiClient } from "./api-client";
import { ApiClientProvider } from "./api-client-provider";
import { createFixtureApiClient } from "./fixture-api-client";
import { useApiClient } from "./use-api-client";

const STEAM_ID = "76561198000000000";

const remembering = (stored: string | undefined): SteamIdStorage => ({
  read: () => Promise.resolve(stored),
  write: () => Promise.resolve(),
  forget: () => Promise.resolve(),
});

const fixture: ApiClient = createFixtureApiClient({
  profile: {
    steamId: STEAM_ID,
    personaName: "Tarnished",
    avatarUrl: "",
    profileUrl: "",
  },
  games: [],
  progress: {},
});

describe("useApiClient", () => {
  /**
   * The seam ADR-0022 opens: whatever sits above a page decides where its data
   * comes from, so a story can serve fixtures through the page's real loading
   * path instead of mocking the module the client is built in.
   */
  it("serves the client its provider creates for the chosen profile", async () => {
    const create = jest.fn((_steamId: string) => fixture);
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <SteamIdProvider storage={remembering(STEAM_ID)}>
        <ApiClientProvider create={create}>{children}</ApiClientProvider>
      </SteamIdProvider>
    );

    const { result } = renderHook(() => useApiClient(), { wrapper });

    await waitFor(() => expect(result.current).toBe(fixture));
    expect(create).toHaveBeenCalledWith(STEAM_ID);
  });

  it("serves nothing while no profile has been chosen", async () => {
    const create = jest.fn((_steamId: string) => fixture);
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <SteamIdProvider storage={remembering(undefined)}>
        <ApiClientProvider create={create}>{children}</ApiClientProvider>
      </SteamIdProvider>
    );

    const { result } = renderHook(() => useApiClient(), { wrapper });

    await waitFor(() => expect(create).not.toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });
});
