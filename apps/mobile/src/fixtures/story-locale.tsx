import type { ComponentType } from "react";

import { translatorFor, type Translate } from "../i18n/i18n";
import { DEFAULT_LOCALE, isLocale } from "../i18n/locale";

/** What a story's own args are written in: the controls panel stays English. */
export const english: Translate = translatorFor(DEFAULT_LOCALE);

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

/**
 * A story's `render` for a component whose args a view-model wrote: they are
 * built before any component renders, so they are rebuilt here in the language
 * the toolbar names (ADR-0023). The story's own args stay English.
 */
export const inTheToolbarsLanguage =
  <Props extends object>(
    Component: ComponentType<Props>,
    build: (t: Translate) => Partial<Props>,
  ) =>
  (args: Props, { globals }: { readonly globals: Readonly<Record<string, unknown>> }) => (
    <Component {...args} {...build(translatorForGlobals(globals))} />
  );
