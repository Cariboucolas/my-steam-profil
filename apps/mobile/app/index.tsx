import { Redirect, useRouter } from "expo-router";
import { useCallback } from "react";

import { LibraryPage } from "../src/components/pages/LibraryPage";
import { useSteamId } from "../src/settings/steam-id-store";

/**
 * The library's route: what depends on the router, and nothing else. Loading
 * and drawing the library is the page's (ADR-0022).
 */
export default function LibraryRoute() {
  const router = useRouter();
  const { state: steamId } = useSteamId();

  const openGame = useCallback(
    (appId: number) => router.push(`/game/${appId}`),
    [router],
  );
  const changeProfile = useCallback(() => router.push("/setup"), [router]);

  if (steamId.status === "absent") {
    return <Redirect href="/setup" />;
  }

  return <LibraryPage onOpenGame={openGame} onChangeProfile={changeProfile} />;
}
