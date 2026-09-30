import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { Locale } from "../../i18n/locale";
import type { LocaleStorage } from "../../settings/locale-storage";
import { LocaleProvider } from "../../settings/locale-store";
import type { SteamIdStorage } from "../../settings/steam-id-storage";
import { SteamIdProvider } from "../../settings/steam-id-store";
import { SetupPage } from "./SetupPage";

const steamIdStorage: SteamIdStorage = {
  read: () => Promise.resolve(undefined),
  write: () => Promise.resolve(),
  forget: () => Promise.resolve(),
};

const heldLocale = (initial?: Locale) => {
  let current = initial;
  const storage: LocaleStorage = {
    read: () => Promise.resolve(current),
    write: (locale) => {
      current = locale;
      return Promise.resolve();
    },
  };
  return { storage, held: () => current };
};

const renderSetup = (device: LocaleStorage) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <LocaleProvider storage={device}>
        <SteamIdProvider storage={steamIdStorage}>
          <SetupPage onLeave={() => {}} />
        </SteamIdProvider>
      </LocaleProvider>
    </SafeAreaProvider>,
  );

describe("SetupPage language", () => {
  it("offers English first, stored as English when nothing was chosen", async () => {
    const device = heldLocale();
    const { getByLabelText } = renderSetup(device.storage);

    expect(getByLabelText("Language")).toBeTruthy();
    await waitFor(() => expect(device.held()).toBe("en"));
  });

  it("switches to French and keeps the choice on the device", async () => {
    const device = heldLocale();
    const { getByText, getByLabelText } = renderSetup(device.storage);

    fireEvent.press(getByText("FR"));

    await waitFor(() => expect(getByLabelText("Langue")).toBeTruthy());
    expect(device.held()).toBe("fr");
  });

  it("offers no choice it could not keep when no locale store is mounted", () => {
    const { queryByLabelText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <SteamIdProvider storage={steamIdStorage}>
          <SetupPage onLeave={() => {}} />
        </SteamIdProvider>
      </SafeAreaProvider>,
    );

    expect(queryByLabelText("Language")).toBeNull();
  });
});
