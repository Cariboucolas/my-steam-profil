import { isLocale, type Locale } from "../i18n/locale";
import type { KeyValueStore } from "./steam-id-storage";

export type LocaleStorage = {
  /** The stored locale, or nothing when there is none worth trusting. */
  read(): Promise<Locale | undefined>;
  write(locale: Locale): Promise<void>;
};

/** Namespaced beside the steam id: on web the store is localStorage, shared across the origin. */
export const LOCALE_KEY = "steam-achievements.locale";

export const createLocaleStorage = (store: KeyValueStore): LocaleStorage => ({
  /**
   * Validates on the way out, as the steam id does: a value can come from an
   * older build or from someone editing localStorage, and neither is a locale
   * the app has a catalog for.
   */
  read: async () => {
    const stored = await store.getItem(LOCALE_KEY);
    return isLocale(stored) ? stored : undefined;
  },

  write: (locale) => store.setItem(LOCALE_KEY, locale),
});
