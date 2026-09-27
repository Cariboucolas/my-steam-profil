import { useFonts } from "@expo-google-fonts/ibm-plex-sans";
import type { Decorator, Preview } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";

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

const preview: Preview = {
  decorators: [withAppFonts],
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { options: PHONES },
  },
  initialGlobals: {
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
