import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";
import { Text } from "react-native";

import { deviceAsksForLessMotion } from "../accessibility/reduce-motion.test-support";
import type { SteamIdStorage } from "../settings/steam-id-storage";
import { SteamIdProvider } from "../settings/steam-id-store";
import SetupScreen from "../../app/setup";

const STEAM_ID = "76561197979269357";
const OTHER_STEAM_ID = "76561197960287930";

const LibraryStub = () => <Text>library screen</Text>;

/** Remembers what it was told, so a test can ask what the device now holds. */
const recordingStorage = (stored: string | undefined) => {
  let current = stored;
  const storage: SteamIdStorage = {
    read: () => Promise.resolve(current),
    write: (steamId) => {
      current = steamId;
      return Promise.resolve();
    },
    forget: () => {
      current = undefined;
      return Promise.resolve();
    },
  };
  return { storage, held: () => current };
};

const renderSetup = (stored: string | undefined) => {
  const device = recordingStorage(stored);
  const router = renderRouter(
    { index: LibraryStub, setup: SetupScreen },
    {
      initialUrl: "/setup",
      wrapper: ({ children }) => (
        <SteamIdProvider storage={device.storage}>{children}</SteamIdProvider>
      ),
    },
  );
  return { ...router, held: device.held };
};

describe("setup screen", () => {
  beforeEach(deviceAsksForLessMotion);

  afterEach(async () => {
    await act(async () => {});
  });

  it("asks which profile to show", async () => {
    renderSetup(undefined);

    await waitFor(() =>
      expect(screen.getByText("Which Steam profile?")).toBeTruthy(),
    );
    expect(screen.getByLabelText("SteamID64")).toBeTruthy();
  });

  it("remembers the profile it was given and shows the library", async () => {
    const { held } = renderSetup(undefined);
    const field = await screen.findByLabelText("SteamID64");

    fireEvent.changeText(field, OTHER_STEAM_ID);
    fireEvent.press(screen.getByText("Show this profile"));

    await waitFor(() => expect(screen.getByText("library screen")).toBeTruthy());
    expect(held()).toBe(OTHER_STEAM_ID);
  });

  /**
   * The store validates through the domain without touching the network, so a
   * typo costs nothing and cannot be aimed at the backend. The screen has to
   * stay put for the reader to correct it.
   */
  it("stays put on something that is not a SteamID64", async () => {
    const { held } = renderSetup(undefined);
    const field = await screen.findByLabelText("SteamID64");

    fireEvent.changeText(field, "not-seventeen-digits");
    fireEvent.press(screen.getByText("Show this profile"));

    await waitFor(() => expect(screen.getByLabelText("SteamID64")).toBeTruthy());
    expect(screen.queryByText("library screen")).toBeNull();
    expect(held()).toBeUndefined();
  });

  describe("the way back", () => {
    /**
     * On a first run this screen is reached by the library's redirect, and
     * there is no library to cancel back to. Offering the control anyway would
     * promise a way out that does not exist.
     */
    it("offers none on a first run", async () => {
      renderSetup(undefined);

      await screen.findByText("Which Steam profile?");
      expect(screen.queryByText("Cancel")).toBeNull();
    });

    it("offers one once a profile is already known", async () => {
      renderSetup(STEAM_ID);

      await waitFor(() => expect(screen.getByText("Cancel")).toBeTruthy());
    });

    it("goes back to the library, keeping the profile it had", async () => {
      const { held } = renderSetup(STEAM_ID);

      fireEvent.press(await screen.findByText("Cancel"));

      await waitFor(() => expect(screen.getByText("library screen")).toBeTruthy());
      expect(held()).toBe(STEAM_ID);
    });
  });
});
