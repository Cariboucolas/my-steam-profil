import { Redirect, useRouter } from "expo-router";
import { useCallback } from "react";

import { StatsPage } from "../src/components/pages/StatsPage";
import { useSteamId } from "../src/settings/steam-id-store";

/**
 * The stats route: what depends on the router, and nothing else. Loading and
 * drawing the stats is the page's (ADR-0022).
 */
export default function StatsRoute() {
  const router = useRouter();
  const { state: steamId } = useSteamId();

  // Opened from a link, this is the only entry in the history: back leads to the library.
  const back = useCallback(
    () => (router.canGoBack() ? router.back() : router.replace("/")),
    [router],
  );
  const changeProfile = useCallback(() => router.push("/setup"), [router]);

  if (steamId.status === "absent") {
    return <Redirect href="/setup" />;
  }

  return <StatsPage onBack={back} onChangeProfile={changeProfile} />;
}
