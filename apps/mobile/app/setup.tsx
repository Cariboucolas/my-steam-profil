import { useRouter } from "expo-router";
import { useCallback } from "react";

import { SetupPage } from "../src/components/pages/SetupPage";

/**
 * The setup route: what depends on the router, and nothing else (ADR-0022).
 */
export default function SetupRoute() {
  const router = useRouter();

  // Pops back to the library rather than stacking another copy of it. When
  // there is no library to pop back to — a first run reached by the redirect,
  // a reload, or a deep link straight to /setup, where router.back() would be
  // a silent no-op — dismissTo replaces this screen with it instead.
  const leave = useCallback(() => router.dismissTo("/"), [router]);

  return <SetupPage onLeave={leave} />;
}
