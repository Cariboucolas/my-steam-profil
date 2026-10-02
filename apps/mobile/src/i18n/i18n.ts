import i18next, { type i18n, type TFunction } from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./catalogs/en";
import { fr } from "./catalogs/fr";
import { DEFAULT_LOCALE, type Locale } from "./locale";

/** The `t` a view-model is handed: bound to one locale, and to nothing else (ADR-0023). */
export type Translate = TFunction;

export const CATALOGS = { en, fr } as const;

/**
 * One instance holds every catalog. It is never asked to change language:
 * a locale is reached through `i18nFor`, which clones it, so nothing here has a
 * "current language" for a stray call to read.
 */
const root = i18next.createInstance();

void root.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: false,
  supportedLngs: Object.keys(CATALOGS),
  // Resources are in the bundle, so init settles before it returns and a
  // first render never waits on it.
  initAsync: false,
  // React Native draws text, never HTML: escaping would turn "&" into "&amp;".
  interpolation: { escapeValue: false },
  returnNull: false,
});

const clones = new Map<Locale, i18n>();

/** An i18n instance whose language is `locale`, for a provider to hand to components. */
export const i18nFor = (locale: Locale): i18n => {
  const known = clones.get(locale);
  if (known) return known;

  const made = root.cloneInstance({ lng: locale, initAsync: false });
  clones.set(locale, made);
  return made;
};

/** `t` fixed on `locale`: what a `use-*` hook hands down to a view-model. */
export const translatorFor = (locale: Locale): Translate => root.getFixedT(locale);
