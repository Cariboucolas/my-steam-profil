/** The languages the app is written in, as BCP 47 tags (ADR-0010, ADR-0023). */
export const LOCALES = ["en", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

/** What the app speaks until the reader chooses; never seeded from the device. */
export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (value: unknown): value is Locale =>
  LOCALES.some((locale) => locale === value);
