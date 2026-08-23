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
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import { resolveInitialSteamId } from "../src/api-client/config";
import { createSteamIdStorage } from "../src/settings/steam-id-storage";
import { SteamIdProvider } from "../src/settings/steam-id-store";
import { colors } from "../src/theme/tokens";

/** The width the design was drawn at. */
const PHONE_WIDTH = 402;

// Built once, outside the component: a fresh storage object on every render
// would restart the read inside SteamIdProvider's effect, forever.
const storage = createSteamIdStorage(AsyncStorage);

// The build may offer a profile; the device overrides it. Keeps `pnpm start`
// on this machine as immediate as it was before the setup screen existed.
const initialSteamId = resolveInitialSteamId(process.env.EXPO_PUBLIC_STEAM_ID);

void SplashScreen.preventAutoHideAsync();

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
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colors.bg,
              // A phone-width column, centred. No effect on a phone, where the
              // screen is narrower; it keeps the web preview honest.
              width: "100%",
              maxWidth: PHONE_WIDTH,
              alignSelf: "center",
            },
          }}
        />
      </SteamIdProvider>
    </SafeAreaProvider>
  );
}
