import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { SteamIdStorage } from "./steam-id-storage";
import { SteamIdProvider, useSteamId } from "./steam-id-store";

const STEAM_ID = "76561197979269357";
const OTHER_STEAM_ID = "76561197960287930";

/** A storage that answers from memory, so no device is involved. */
const createFakeStorage = (stored?: string): SteamIdStorage => {
  let current = stored;
  return {
    read: () => Promise.resolve(current),
    write: (steamId) => {
      current = steamId;
      return Promise.resolve();
    },
    forget: () => {
      current = undefined;
      return Promise.resolve();
    },
  };
};

const renderStore = (storage: SteamIdStorage, fallback?: string) =>
  renderHook(() => useSteamId(), {
    wrapper: ({ children }: { readonly children: ReactNode }) => (
      <SteamIdProvider storage={storage} fallback={fallback}>
        {children}
      </SteamIdProvider>
    ),
  });

describe("steam id store", () => {
  it("has no profile when the device holds none and the build offers none", async () => {
    const { result } = renderStore(createFakeStorage());

    await waitFor(() => expect(result.current.state.status).toBe("absent"));
  });

  it("starts on the profile the device remembers", async () => {
    const { result } = renderStore(createFakeStorage(STEAM_ID));

    await waitFor(() => expect(result.current.state).toEqual({
      status: "known",
      steamId: STEAM_ID,
    }));
  });

  it("falls back to the profile the build was given", async () => {
    const { result } = renderStore(createFakeStorage(), STEAM_ID);

    await waitFor(() => expect(result.current.state).toEqual({
      status: "known",
      steamId: STEAM_ID,
    }));
  });

  it("prefers what the device remembers over what the build offers", async () => {
    const { result } = renderStore(createFakeStorage(STEAM_ID), OTHER_STEAM_ID);

    await waitFor(() => expect(result.current.state).toEqual({
      status: "known",
      steamId: STEAM_ID,
    }));
  });

  it("remembers a steam id it is given", async () => {
    const storage = createFakeStorage();
    const { result } = renderStore(storage);
    await waitFor(() => expect(result.current.state.status).toBe("absent"));

    let accepted = false;
    await act(async () => {
      accepted = await result.current.remember(` ${STEAM_ID} `);
    });

    expect(accepted).toBe(true);
    expect(result.current.state).toEqual({ status: "known", steamId: STEAM_ID });
    await expect(storage.read()).resolves.toBe(STEAM_ID);
  });

  it("refuses what is not a steam id, and stores nothing", async () => {
    const storage = createFakeStorage();
    const { result } = renderStore(storage);
    await waitFor(() => expect(result.current.state.status).toBe("absent"));

    let accepted = true;
    await act(async () => {
      accepted = await result.current.remember("my-steam-name");
    });

    expect(accepted).toBe(false);
    expect(result.current.state.status).toBe("absent");
    await expect(storage.read()).resolves.toBeUndefined();
  });

  it("forgets the profile", async () => {
    const storage = createFakeStorage(STEAM_ID);
    const { result } = renderStore(storage);
    await waitFor(() => expect(result.current.state.status).toBe("known"));

    await act(async () => {
      await result.current.forget();
    });

    expect(result.current.state.status).toBe("absent");
    await expect(storage.read()).resolves.toBeUndefined();
  });
});
