import { SteamId } from "@steam/domain";

/**
 * The narrow slice of a key-value store this needs. AsyncStorage satisfies it
 * exactly, which is why nothing here imports AsyncStorage: the seam costs one
 * type and buys tests that run without a device.
 */
export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type SteamIdStorage = {
  /** The stored steam id, or nothing when there is none worth trusting. */
  read(): Promise<string | undefined>;
  write(steamId: string): Promise<void>;
  forget(): Promise<void>;
};

/** Namespaced: on web the store is localStorage, shared across the origin. */
export const STEAM_ID_KEY = "steam-achievements.steam-id";

export const createSteamIdStorage = (store: KeyValueStore): SteamIdStorage => ({
  /**
   * Validates on the way out rather than trusting what is on the device. A
   * value can come from an older build, or from someone editing localStorage —
   * neither is a reason to send a malformed id to the backend.
   */
  read: async () => {
    const stored = await store.getItem(STEAM_ID_KEY);
    const steamId = SteamId.create(stored ?? "");
    return steamId.ok ? steamId.value.value : undefined;
  },

  write: (steamId) => store.setItem(STEAM_ID_KEY, steamId),

  forget: () => store.removeItem(STEAM_ID_KEY),
});
