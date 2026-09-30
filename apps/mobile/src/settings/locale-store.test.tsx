import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { Locale } from "../i18n/locale";
import type { LocaleStorage } from "./locale-storage";
import { LocaleProvider, useLocale } from "./locale-store";

/** A storage that answers from memory, and says what the device now holds. */
const createFakeStorage = (stored?: Locale) => {
  let current = stored;
  const storage: LocaleStorage = {
    read: () => Promise.resolve(current),
    write: (locale) => {
      current = locale;
      return Promise.resolve();
    },
  };
  return { storage, held: () => current };
};

const renderStore = (storage: LocaleStorage) =>
  renderHook(() => ({ setting: useLocale(), translation: useTranslation() }), {
    wrapper: ({ children }: { readonly children: ReactNode }) => (
      <LocaleProvider storage={storage}>{children}</LocaleProvider>
    ),
  });

describe("locale store", () => {
  it("is English with nothing stored, and stores English", async () => {
    const device = createFakeStorage();
    const { result } = renderStore(device.storage);

    await waitFor(() => expect(device.held()).toBe("en"));
    expect(result.current.setting.locale).toBe("en");
    expect(result.current.translation.t("library.neverPlayed")).toBe("never played");
  });

  it("starts on the locale the device remembers", async () => {
    const { result } = renderStore(createFakeStorage("fr").storage);

    await waitFor(() => expect(result.current.setting.locale).toBe("fr"));
    expect(result.current.translation.t("library.neverPlayed")).toBe("jamais lancé");
  });

  it("changes language at once and keeps the choice across a restart", async () => {
    const device = createFakeStorage();
    const first = renderStore(device.storage);
    await waitFor(() => expect(device.held()).toBe("en"));

    await act(async () => {
      await first.result.current.setting.choose?.("fr");
    });

    expect(first.result.current.translation.t("library.neverPlayed")).toBe("jamais lancé");
    expect(device.held()).toBe("fr");
    first.unmount();

    const restarted = renderStore(device.storage);
    await waitFor(() => expect(restarted.result.current.setting.locale).toBe("fr"));
  });

  it("keeps the choice for the session when the device will not store it", async () => {
    const storage: LocaleStorage = {
      read: () => Promise.resolve(undefined),
      write: () => Promise.reject(new Error("disk full")),
    };
    const { result } = renderStore(storage);

    await act(async () => {
      await result.current.setting.choose?.("fr");
    });

    expect(result.current.setting.locale).toBe("fr");
  });

  it("speaks English and offers no choice where no provider is mounted", () => {
    const { result } = renderHook(() => useLocale());

    expect(result.current).toEqual({ locale: "en", choose: undefined });
  });
});
