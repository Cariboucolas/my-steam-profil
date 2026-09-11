import {
  act,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";
import { Text } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { deviceAsksForLessMotion } from "../accessibility/reduce-motion.test-support";
import RootLayout from "../../app/_layout";

/**
 * Whether the fonts have arrived. The real hook answers asynchronously from a
 * native module; what this layout does about the answer is the whole of what
 * there is to test here.
 */
let mockFontsLoaded = true;

jest.mock("@expo-google-fonts/ibm-plex-sans", () => ({
  useFonts: () => [mockFontsLoaded],
  IBMPlexSans_400Regular: "sans-400",
  IBMPlexSans_500Medium: "sans-500",
  IBMPlexSans_600SemiBold: "sans-600",
}));

jest.mock("@expo-google-fonts/ibm-plex-mono", () => ({
  IBMPlexMono_400Regular: "mono-400",
  IBMPlexMono_500Medium: "mono-500",
  IBMPlexMono_600SemiBold: "mono-600",
}));

/** The layout reads the device store directly; the package ships this mock. */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}));

const Stub = () => <Text>library screen</Text>;

const renderApp = (fontsLoaded: boolean) => {
  mockFontsLoaded = fontsLoaded;
  return renderRouter({ _layout: RootLayout, index: Stub }, { initialUrl: "/" });
};

describe("root layout", () => {
  beforeEach(() => {
    deviceAsksForLessMotion();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {});
  });

  /**
   * Holding the splash screen avoids a flash of system font before IBM Plex
   * arrives, and every size in the design is tuned for it. Drawing the app
   * early would show the wrong one for a frame.
   */
  it("draws nothing of the app until the fonts have arrived", async () => {
    renderApp(false);

    await waitFor(() => expect(screen.queryByText("library screen")).toBeNull());
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it("shows the app and lets the splash go once they have", async () => {
    renderApp(true);

    await waitFor(() => expect(screen.getByText("library screen")).toBeTruthy());
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });
});
