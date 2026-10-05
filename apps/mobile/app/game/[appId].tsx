import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { GamePage } from "../../src/components/pages/GamePage";
import { useSteamId } from "../../src/settings/steam-id-store";

/**
 * One game's route: what depends on the router, and nothing else. Loading and
 * drawing the game is the page's (ADR-0022).
 */
export default function GameRoute() {
  const router = useRouter();
  // Expo Router passes route params through the URL, so this is a string even
  // though the route reads like a number.
  const { appId: appIdParam } = useLocalSearchParams<{ appId: string }>();
  const appId = Number.parseInt(appIdParam ?? "", 10);
  const { state: steamId } = useSteamId();

  // Opened from a link, the game is the only entry in the history, and going
  // back would do nothing: the library is where back leads then.
  const back = useCallback(
    () => (router.canGoBack() ? router.back() : router.replace("/")),
    [router],
  );
  const changeProfile = useCallback(() => router.push("/setup"), [router]);

  if (steamId.status === "absent") {
    return <Redirect href="/setup" />;
  }

  return <GamePage appId={appId} onBack={back} onChangeProfile={changeProfile} />;
}
