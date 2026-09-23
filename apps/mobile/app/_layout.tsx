import {
  useFonts,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from "@expo-google-fonts/ibm-plex-mono";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import { NOT_READ } from "../src/accessibility/not-read";
import { resolveInitialSteamId } from "../src/api-client/config";
import { SplashStage } from "../src/components/organisms/SplashStage";
import { startReporting } from "../src/reporting/start";
import { createSteamIdStorage } from "../src/settings/steam-id-storage";
import { SteamIdProvider, useSteamId } from "../src/settings/steam-id-store";
import { colors } from "../src/theme/tokens";

/** The width the design was drawn at. */
const PHONE_WIDTH = 402;

// Built once, outside the component: a fresh storage object on every render
// would restart the read inside SteamIdProvider's effect, forever.
const storage = createSteamIdStorage(AsyncStorage);

// The build may offer a profile; the device overrides it. Keeps `pnpm start`
// on this machine as immediate as it was before the setup screen existed.
const initialSteamId = resolveInitialSteamId(process.env.EXPO_PUBLIC_STEAM_ID);

// Before the first render, so a failure on the way up is reported rather
// than only seen. Does nothing outside a live build (ADR-0017).
startReporting();

void SplashScreen.preventAutoHideAsync();

/**
 * Fades the native splash rather than cutting it, so the handover to the stage
 * below reads as one screen settling rather than as two screens swapping.
 */
SplashScreen.setOptions({ fade: true });

/**
 * Holds the branded stage over the app until both have finished: the device
 * store, which says which profile to show, and the stage's own reveal.
 *
 * The app is mounted underneath rather than after, so the profile it fetches is
 * already on its way while the mark is still drawing. That is the whole reason
 * the stage is worth holding at all — it covers work instead of adding to it.
 *
 * While it covers, the app below is out of the accessibility traversal. A
 * reader listening to a screen nobody can see would otherwise be read the
 * library before the stage has given way.
 */
function SplashGate({ children }: { readonly children: ReactNode }) {
  const { state } = useSteamId();
  const [covered, setCovered] = useState(true);

  const uncover = useCallback(() => setCovered(false), []);

  if (!covered) {
    return <>{children}</>;
  }

  return (
    <View style={styles.fill}>
      <View style={styles.fill} {...NOT_READ}>
        {children}
      </View>
      <View style={StyleSheet.absoluteFill}>
        <SplashStage ready={state.status !== "loading"} onDone={uncover} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Holding the splash screen avoids a flash of system font before IBM Plex
  // arrives; every size in the design is tuned for it.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SteamIdProvider storage={storage} fallback={initialSteamId}>
        <SplashGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: colors.bg,
                // A phone-width column, centred. No effect on a phone, where
                // the screen is narrower; it keeps the web preview honest.
                width: "100%",
                maxWidth: PHONE_WIDTH,
                alignSelf: "center",
              },
            }}
          />
        </SplashGate>
      </SteamIdProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
