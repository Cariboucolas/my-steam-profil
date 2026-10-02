import { useFonts } from "@expo-google-fonts/ibm-plex-sans";
import type { Decorator, Preview } from "@storybook/react-native-web-vite";
import { I18nextProvider } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18nFor } from "../src/i18n/i18n";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "../src/i18n/locale";
import { FreshQueries } from "../src/query/FreshQueries";
import { APP_FONT_FACES } from "../src/theme/font-faces";
import { colors, spacing } from "../src/theme/tokens";

/**
 * Widths rather than devices: the components read the window's width, so the
 * viewport is the only honest way to hand them a narrower or a wider phone.
 */
const PHONES = {
  phone375: { name: "Narrowest phone · 375", styles: { width: "375px", height: "812px" } },
  phone390: { name: "Phone · 390", styles: { width: "390px", height: "844px" } },
  phone430: { name: "Large phone · 430", styles: { width: "430px", height: "932px" } },
};

/** The phone a story is drawn on unless it asks for another (#75). */
const DEFAULT_PHONE: keyof typeof PHONES = "phone390";

/**
 * Every size in the design is tuned for IBM Plex, so a story waits for it as
 * the app does rather than drawing a frame in the system font first.
 */
const withAppFonts: Decorator = (Story) => {
  const [loaded] = useFonts(APP_FONT_FACES);

  return <View style={styles.screen}>{loaded ? <Story /> : null}</View>;
};

/**
 * The gallery draws no status bar and no home indicator, so there is nothing
 * for a screen to hold itself clear of. Given up front rather than measured,
 * so a story draws on its first render, in the browser and in Jest alike.
 */
const NO_INSETS = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const withSafeArea: Decorator = (Story) => (
  <SafeAreaProvider initialMetrics={NO_INSETS}>
    <Story />
  </SafeAreaProvider>
);

/**
 * Gives every story an i18n instance for the toolbar's language (ADR-0023).
 * It mounts no locale store and no SteamID store: the gallery's language is a
 * toolbar choice, not a setting, and nothing here is persisted.
 */
const withLocale: Decorator = (Story, context) => {
  const chosen = context.globals["locale"];
  const locale = isLocale(chosen) ? chosen : DEFAULT_LOCALE;

  return (
    <I18nextProvider i18n={i18nFor(locale)}>
      <Story />
    </I18nextProvider>
  );
};

/**
 * Gives every story a cache of its own, where the app keeps one above its
 * routes (#162): a page story loads what it shows each time it is opened, and
 * never draws what the story before it loaded.
 */
const withFreshQueries: Decorator = (Story) => (
  <FreshQueries>
    <Story />
  </FreshQueries>
);

const preview: Preview = {
  // Last is outermost: the safe area wraps the fonts gate, which wraps the locale, which wraps
  // the cache, which wraps the story.
  decorators: [withFreshQueries, withLocale, withAppFonts, withSafeArea],
  globalTypes: {
    locale: {
      description: "Language the stories are written in",
      toolbar: {
        title: "Language",
        icon: "globe",
        items: LOCALES.map((value) => ({ value, title: value })),
        dynamicTitle: true,
      },
    },
  },
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { options: PHONES },
    // The five levels in the order they build on one another, each opening on
    // the Index that says what it holds (ADR-0022).
    options: {
      storySort: {
        order: [
          "Atoms",
          ["Index", "*"],
          "Molecules",
          ["Index", "*"],
          "Organisms",
          ["Index", "*"],
          "Templates",
          ["Index", "*"],
          "Pages",
          ["Index", "*"],
        ],
      },
    },
  },
  initialGlobals: {
    locale: DEFAULT_LOCALE,
    viewport: { value: DEFAULT_PHONE, isRotated: false },
  },
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingVertical: spacing.xl,
  },
});

export default preview;
