import { captureException } from "@sentry/react-native";
import { openURL } from "expo-linking";
import { openBrowserAsync } from "expo-web-browser";
import { Platform } from "react-native";

/**
 * Opens a page that is not ours, the way each platform should.
 *
 * On a device, `Linking.openURL` fires a system intent: it hands the reader to
 * whichever browser app they have, and coming back is a task switch.
 * `openBrowserAsync` is a Chrome Custom Tab on Android and a modal
 * `SFSafariViewController` on iOS, so the reader stays in the app and returns
 * with one gesture. The Expo v57 documentation names this exact case — "if you
 * just want to open a webpage (such as your app privacy policy), then use
 * `WebBrowser.openBrowserAsync`".
 *
 * That describes the intent rather than always the outcome. Android gives a
 * verified app link priority over any browser, so a steamcommunity.com address
 * opens the Steam app wherever it is installed — measured on a device, and the
 * better arrival of the two: the settings page this points at needs a Steam
 * session, which that app has and a cold Custom Tab does not. The reader comes
 * back through the recents rather than with one gesture. `browserPackage`
 * would force the Custom Tab by making the intent explicit, and is deliberately
 * not passed: a tidier return to a page that asks for a login is a poor trade.
 *
 * On the web the reverse holds. `openURL` there is `window.open(url, '_blank')`
 * — a new tab, which is what a link does and which leaves the app where it was.
 * `openBrowserAsync` would open a popup carrying window features, and a browser
 * blocks one of those far more readily than a `_blank` from a gesture; that is
 * what `ERR_WEB_BROWSER_BLOCKED` exists for, and it is web-only.
 *
 * Neither is chosen at module scope: read at call time, so a test can say which
 * platform it is asking about.
 *
 * A browser that will not open is not recoverable here, and every caller draws
 * something whose point is what it says rather than where it leads. So this
 * resolves either way and the caller keeps its link — nothing is gained by
 * taking a screen down over a page that did not open. One platform this
 * genuinely cannot serve is the app inside another app's webview, where the
 * popup policy belongs to the host.
 *
 * It resolves either way, and it says so. A swallowed throw that reaches
 * nobody is indistinguishable from a link nobody pressed: #98 raised at this
 * exact call — a native module the runtime did not have — and surfaced days
 * later by re-reading a ticket. Reporting keeps the guard and removes its
 * silence; outside a live build it goes nowhere, by construction (ADR-0017).
 */
export const openExternalUrl = async (url: string): Promise<void> => {
  try {
    if (Platform.OS === "web") {
      await openURL(url);
      return;
    }
    await openBrowserAsync(url);
  } catch (error) {
    // Deliberately not rethrown — see above. There is nothing to tell a reader
    // that the note they are already looking at does not say better. Which is
    // the reason to tell someone else instead.
    captureException(error);
  }
};
