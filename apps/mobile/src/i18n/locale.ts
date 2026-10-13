/** The languages the app is written in, as BCP 47 tags (ADR-0010, ADR-0023). */
export const LOCALES = ["en", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

/** What the app speaks until the reader chooses; never seeded from the device. */
export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (value: unknown): value is Locale =>
  LOCALES.some((locale) => locale === value);

/**
 * The day a week starts on, as `Date.getDay` numbers it: Sunday is 0. Decided
 * by the Locale with the rest of its conventions, never by the device.
 */
export const FIRST_DAY_OF_WEEK: Readonly<Record<Locale, number>> = { en: 0, fr: 1 };
