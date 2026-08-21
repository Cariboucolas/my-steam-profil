import { createSteamIdStorage, STEAM_ID_KEY, type KeyValueStore } from "./steam-id-storage";

const STEAM_ID = "76561197979269357";

/**
 * A store held in a plain object. The real one is AsyncStorage, which this
 * shape is cut from — nothing here needs a device.
 */
const createFakeStore = (initial: Readonly<Record<string, string>> = {}) => {
  const entries: Record<string, string> = { ...initial };
  const store: KeyValueStore = {
    // noUncheckedIndexedAccess makes this string | undefined, and the real
    // AsyncStorage answers null for a missing key.
    getItem: (key) => Promise.resolve(entries[key] ?? null),
    setItem: (key, value) => {
      entries[key] = value;
      return Promise.resolve();
    },
    removeItem: (key) => {
      delete entries[key];
      return Promise.resolve();
    },
  };
  return { store, entries };
};

describe("steam id storage", () => {
  it("reads nothing on a device that was never told which profile to show", async () => {
    const { store } = createFakeStore();
    await expect(createSteamIdStorage(store).read()).resolves.toBeUndefined();
  });

  it("reads back the steam id it was given", async () => {
    const { store } = createFakeStore();
    const storage = createSteamIdStorage(store);

    await storage.write(STEAM_ID);

    await expect(storage.read()).resolves.toBe(STEAM_ID);
  });

  it("forgets the steam id", async () => {
    const { store } = createFakeStore({ [STEAM_ID_KEY]: STEAM_ID });
    const storage = createSteamIdStorage(store);

    await storage.forget();

    await expect(storage.read()).resolves.toBeUndefined();
  });

  it("ignores a stored value that is not a steam id", async () => {
    // On web the store is localStorage, which anyone can edit by hand; an
    // older build could also have left something else behind.
    const { store } = createFakeStore({ [STEAM_ID_KEY]: "my-steam-name" });

    await expect(createSteamIdStorage(store).read()).resolves.toBeUndefined();
  });

  it("keeps its key to itself, since the web store is shared per origin", () => {
    expect(STEAM_ID_KEY).toBe("steam-achievements.steam-id");
  });
});
