/** The one value that claims a build is the live site, read as in `api-client/config`. */
const LIVE = "true";

/** What a build was given about itself, before any of it is trusted. */
export type ReportingEnvironment = {
  readonly dsn: string | undefined;
  readonly live: string | undefined;
  readonly sha: string | undefined;
  readonly platform: string;
  readonly channel: string | undefined;
};

/** What the reporter needs, once the build has been found worth reporting from. */
export type ReportingConfig = {
  readonly dsn: string;
  readonly release: string;
  readonly environment: string;
};

/**
 * Whether this build reports its errors, and under what name.
 *
 * Three things have to hold, and each absence means something different.
 *
 * A **destination** is the switch: `EXPO_PUBLIC_SENTRY_DSN` is a repository
 * variable rather than a secret — a client DSN ships inside the bundle by
 * construction and reads nothing — so emptying it turns reporting off without
 * touching code, the way `EAS_ENABLED` stops updates.
 *
 * **Live** keeps a laptop out of the channel. The value of a notification is
 * that it means something, and nothing empties it faster than filling it from
 * a development run. Read as the word `true`, so `EXPO_PUBLIC_LIVE=false` is
 * not the loudest way to claim the opposite (ADR-0016).
 *
 * A **commit** is what a report is pinned to. Unattributable, it is an
 * anecdote (ADR-0017), and the source maps that make its stack readable are
 * uploaded under that same whole SHA — shortening is for reading, and a
 * release is matched rather than read.
 *
 * The environment is where this bundle was published: the update channel where
 * one published it, and the platform on the web, which has no channel.
 */
export const resolveReportingConfig = ({
  dsn,
  live,
  sha,
  platform,
  channel,
}: ReportingEnvironment): ReportingConfig | undefined => {
  const destination = dsn?.trim();
  const release = sha?.trim();
  if (!destination || !release || live?.trim() !== LIVE) return undefined;

  return {
    dsn: destination,
    release,
    environment: channel?.trim() || platform,
  };
};
