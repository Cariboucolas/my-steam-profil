import { init } from "@sentry/react-native";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

import { resolveReportingConfig, type ReportingEnvironment } from "./config";

/**
 * What this build was told about itself, read where the globals live.
 *
 * `EXPO_PUBLIC_` values are substituted into the bundle at build time rather
 * than read at runtime, so these are constants by the time anyone calls this.
 * The channel is not: it is what EAS published this update on, absent on the
 * web and on a build no update ever reached.
 */
const readEnvironment = (): ReportingEnvironment => ({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  live: process.env.EXPO_PUBLIC_LIVE,
  sha: process.env.EXPO_PUBLIC_COMMIT_SHA,
  platform: Platform.OS,
  channel: Updates.channel ?? undefined,
});

/**
 * Starts error reporting, or does not (ADR-0017).
 *
 * Not starting is the stronger of the two: an SDK that initialises and then
 * declines to send still holds a handler, still batches, and still has a way
 * to be wrong about which build it is. A development run installs nothing.
 *
 * What is passed is as much a decision as what is read:
 *
 * - `sendDefaultPii` off — the IP address, cookies and headers the SDK would
 *   otherwise attach describe whoever is holding the phone, not what they
 *   asked for, and have never helped reproduce a failure here.
 * - `sampleRate` whole — sampling protects a quota this volume cannot
 *   threaten, and pays for it by discarding the rare crash it was installed
 *   to catch. The ceiling belongs on the quota side, where throttling is
 *   visible.
 * - `tracesSampleRate` zero — performance is a different question, and #108
 *   scopes this one to whether something is broken.
 *
 * The environment is injectable so a test can say which build it is asking
 * about, the way `openExternalUrl` reads its platform at call time.
 */
export const startReporting = (environment: ReportingEnvironment = readEnvironment()): void => {
  const config = resolveReportingConfig(environment);
  if (!config) return;

  init({
    ...config,
    sendDefaultPii: false,
    sampleRate: 1,
    tracesSampleRate: 0,
  });
};
