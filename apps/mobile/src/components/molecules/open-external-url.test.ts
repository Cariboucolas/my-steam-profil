import { captureException } from "@sentry/react-native";
import { openURL } from "expo-linking";
import { openBrowserAsync } from "expo-web-browser";
import { Platform } from "react-native";

import { openExternalUrl } from "./open-external-url";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("expo-linking", () => ({ openURL: jest.fn(() => Promise.resolve(true)) }));
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: "opened" })),
}));

const tab = openURL as jest.MockedFunction<typeof openURL>;
const inApp = openBrowserAsync as jest.MockedFunction<typeof openBrowserAsync>;
const reported = captureException as jest.MockedFunction<typeof captureException>;

/** Jest runs as ios, so a web test says so and puts it back. */
const asPlatform = (os: string) => {
  const was = Platform.OS;
  (Platform as unknown as { OS: string }).OS = os;
  return () => {
    (Platform as unknown as { OS: string }).OS = was;
  };
};

const URL = "https://steamcommunity.com/my/edit/settings";

beforeEach(() => {
  tab.mockClear();
  inApp.mockClear();
  reported.mockClear();
});

describe("openExternalUrl", () => {
  /**
   * A new tab is what a link does on the web, and it leaves the app where it
   * was. `openBrowserAsync` there would open a popup with window features,
   * which a browser blocks far more readily than a `_blank` from a gesture —
   * `ERR_WEB_BROWSER_BLOCKED` is a web-only error for that reason.
   */
  it("opens a new tab on the web", async () => {
    const restore = asPlatform("web");
    try {
      await openExternalUrl(URL);
    } finally {
      restore();
    }

    expect(tab).toHaveBeenCalledWith(URL);
    expect(inApp).not.toHaveBeenCalled();
  });

  /**
   * `Linking.openURL` on Android fires a system intent: it hands the reader to
   * whichever browser app they have, and coming back is a task switch.
   * `openBrowserAsync` is a Chrome Custom Tab there and a modal
   * SFSafariViewController on iOS — the reader stays in the app and returns
   * with one gesture. The v57 docs name this exact case: "if you just want to
   * open a webpage (such as your app privacy policy)".
   */
  it("keeps the reader in the app on a device", async () => {
    await openExternalUrl(URL);

    expect(inApp).toHaveBeenCalledWith(URL);
    expect(tab).not.toHaveBeenCalled();
  });

  /**
   * Nothing here can recover from a browser that will not open, and the caller
   * draws a note whose point is what it says rather than where it leads. A
   * rejection must not reach a screen and take the library down with it.
   */
  it("does not raise when the browser will not open", async () => {
    inApp.mockRejectedValueOnce(new Error("no browser"));

    await expect(openExternalUrl(URL)).resolves.toBeUndefined();
  });

  /**
   * The guard above is right and this is what was missing from it: a throw
   * that reaches nobody is indistinguishable from a link nobody pressed. #98
   * arrived here — a native module the runtime did not have raises at this
   * exact call — and was found days later by re-reading a ticket.
   */
  it("says what it swallowed", async () => {
    const failure = new Error("no browser");
    inApp.mockRejectedValueOnce(failure);

    await openExternalUrl(URL);

    expect(reported).toHaveBeenCalledWith(failure);
  });

  it("says nothing when the browser opened, which is the ordinary case", async () => {
    await openExternalUrl(URL);

    expect(reported).not.toHaveBeenCalled();
  });
});
