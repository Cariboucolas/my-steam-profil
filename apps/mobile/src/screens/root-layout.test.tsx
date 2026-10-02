import { useQueryClient } from "@tanstack/react-query";
import { act, renderRouter, screen, waitFor } from "expo-router/testing-library";
import * as SplashScreen from "expo-splash-screen";
import { Text } from "react-native";
import RootLayout from "../../app/_layout";
import {
  deviceAsksForLessMotion,
  deviceIsFineWithMotion,
} from "../accessibility/reduce-motion.test-support";
import { SPLASH_WORDMARK } from "../components/organisms/SplashStage";
import { HOLD_MS } from "../splash/splash-timing";

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
  setOptions: jest.fn(),
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

  /**
   * The native splash can only be one image on one colour. The wordmark, and
   * the mark filling itself in, belong to the first screen the app draws — and
   * the two share a background, so the seam between them is invisible rather
   * than merely quick.
   */
  it("carries the mark on from where the native splash left it", async () => {
    renderApp(true);

    await waitFor(() => expect(screen.getByText(SPLASH_WORDMARK)).toBeTruthy());
  });

  /**
   * What a screen loads is kept above the routes, so the next screen finds it
   * (#162). A screen under the layout must reach that cache without mounting
   * anything of its own.
   */
  it("serves every screen the one cache it keeps above the routes", async () => {
    const caches: unknown[] = [];
    const Asking = () => {
      caches.push(useQueryClient());
      return <Text>asking screen</Text>;
    };

    const routes = { _layout: RootLayout, index: Asking, other: Asking };
    renderRouter(routes, { initialUrl: "/" });
    await waitFor(() => expect(screen.getByText("asking screen")).toBeTruthy());
    const [first] = caches;

    renderRouter(routes, { initialUrl: "/other" });
    await waitFor(() => expect(screen.getAllByText("asking screen")).toBeTruthy());

    expect(first).toBeDefined();
    expect(new Set(caches).size).toBe(1);
  });

  describe("while the branded stage is still running", () => {
    beforeEach(() => {
      deviceIsFineWithMotion();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    /**
     * The app mounts underneath rather than after, so the profile it fetches is
     * on its way while the mark is still drawing. The stage covers the work it
     * is overlapping with, which is the point of holding at all.
     */
    it("keeps the app out of earshot while it covers it", async () => {
      renderApp(true);
      await act(async () => {});

      expect(screen.getByText(SPLASH_WORDMARK)).toBeTruthy();
      expect(screen.queryByText("library screen")).toBeNull();
      expect(screen.queryByText("library screen", { includeHiddenElements: true })).toBeTruthy();
    });

    it("hands the app over once it has run its course", async () => {
      renderApp(true);
      await act(async () => {});

      act(() => {
        jest.advanceTimersByTime(HOLD_MS * 2);
      });

      expect(screen.queryByText(SPLASH_WORDMARK)).toBeNull();
      expect(screen.getByText("library screen")).toBeTruthy();
    });
  });
});
