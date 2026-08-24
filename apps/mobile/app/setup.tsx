import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SteamIdForm } from "../src/components/organisms/SteamIdForm";
import { useSteamId } from "../src/settings/steam-id-store";
import { colors, spacing } from "../src/theme/tokens";

/** Enough room above the form that it does not sit under the status bar. */
const TOP_ROOM = 60;

export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, remember } = useSteamId();

  const submit = async (raw: string) => {
    const accepted = await remember(raw);
    // Pops back to the library rather than stacking another copy of it. When
    // there is no library to pop back to — a first run, reached by the redirect
    // — dismissTo falls back to replacing this screen with it.
    if (accepted) {
      router.dismissTo("/");
    }
    return accepted;
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + TOP_ROOM,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      // Otherwise the first tap only dismisses the keyboard.
      keyboardShouldPersistTaps="handled"
    >
      <SteamIdForm
        onSubmit={submit}
        // Nothing to cancel back to on a first run. dismissTo pops to "/" when
        // it is on the stack and replaces this screen with it otherwise, so a
        // reload or a deep link straight to /setup — where router.back() would
        // be a silent no-op — still lands somewhere.
        onCancel={state.status === "known" ? () => router.dismissTo("/") : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
