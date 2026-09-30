import { createLocaleStorage, LOCALE_KEY } from "./locale-storage";
import type { KeyValueStore } from "./steam-id-storage";

const createFakeStore = (initial: Readonly<Record<string, string>> = {}) => {
  const entries: Record<string, string> = { ...initial };
  const store: KeyValueStore = {
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

describe("locale storage", () => {
  it("reads nothing on a device that was never told a language", async () => {
    await expect(createLocaleStorage(createFakeStore().store).read()).resolves.toBeUndefined();
  });

  it("reads back the locale it was given", async () => {
    const storage = createLocaleStorage(createFakeStore().store);

    await storage.write("fr");

    await expect(storage.read()).resolves.toBe("fr");
  });

  it("ignores a stored value that is not a locale the app has", async () => {
    const { store } = createFakeStore({ [LOCALE_KEY]: "de" });

    await expect(createLocaleStorage(store).read()).resolves.toBeUndefined();
  });

  it("keeps its key to itself, beside the steam id's", () => {
    expect(LOCALE_KEY).toBe("steam-achievements.locale");
  });
});
