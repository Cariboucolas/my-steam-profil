import { translatorFor, type Translate } from "../i18n/i18n";
import { DEFAULT_LOCALE, isLocale } from "../i18n/locale";

/**
 * The `t` for the language the gallery's toolbar is set to. For a story whose
 * args a view-model builds: those are computed before any component renders,
 * so they cannot read the locale from a provider and are handed it instead
 * (ADR-0023).
 */
export const translatorForGlobals = (globals: Readonly<Record<string, unknown>>): Translate => {
  const chosen = globals["locale"];
  return translatorFor(isLocale(chosen) ? chosen : DEFAULT_LOCALE);
};
