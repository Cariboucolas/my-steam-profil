import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { I18nextProvider } from "react-i18next";

import { i18nFor } from "../i18n/i18n";
import { DEFAULT_LOCALE, type Locale } from "../i18n/locale";
import type { LocaleStorage } from "./locale-storage";

export type LocaleContextValue = {
  readonly locale: Locale;
  /** Changes the language at once and keeps the choice on the device. */
  choose(locale: Locale): Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

type Props = {
  /** Stable identity, for the same reason as the steam id's: it is an effect dependency. */
  readonly storage: LocaleStorage;
  readonly children: ReactNode;
};

/**
 * The app's locale, and the i18n instance components read it through
 * (ADR-0023). English until the reader chooses; the device's own locale is
 * never consulted, not even to seed the default (ADR-0010).
 */
export function LocaleProvider({ storage, children }: Props) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  // A choice made while the device is still being read must not be overwritten
  // by what the device then says, or by the default it would be given.
  const chosen = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void storage.read().then(
      (stored) => {
        if (cancelled || chosen.current) return;
        if (stored === undefined) {
          // Nothing chosen yet: the default is what is stored, so the device
          // holds the answer to "which language" from the first run.
          void storage.write(DEFAULT_LOCALE).catch(() => undefined);
          return;
        }
        setLocale(stored);
      },
      () => undefined,
    );

    return () => {
      cancelled = true;
    };
  }, [storage]);

  const choose = useCallback(
    async (next: Locale) => {
      chosen.current = true;
      setLocale(next);
      try {
        await storage.write(next);
      } catch {
        // The choice holds for this session even where the device would not keep it.
      }
    },
    [storage],
  );

  const value = useMemo(() => ({ locale, choose }), [locale, choose]);

  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={i18nFor(locale)}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

/**
 * The locale and how to change it, or English with no way to change it where
 * no provider is mounted: a screen drawn on its own (a story, a test) speaks
 * the default and offers no choice it could not keep.
 */
export const useLocale = (): {
  readonly locale: Locale;
  readonly choose: LocaleContextValue["choose"] | undefined;
} => {
  const value = useContext(LocaleContext);
  return value ?? { locale: DEFAULT_LOCALE, choose: undefined };
};
