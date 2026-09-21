import { SteamId } from "@steam/domain";

/** Where the backend listens while developing on this machine. */
const LOCAL_BACKEND = "http://localhost:3000";

/**
 * Where calls go. Unlike the steam id, this stays a build-time setting: a
 * deployed bundle talks to the backend it was built against, and a developer
 * who sets nothing talks to their own machine.
 */
export const resolveBaseUrl = (apiUrl: string | undefined): string =>
  apiUrl?.trim() || LOCAL_BACKEND;

/**
 * The profile a fresh install starts on, when the build offers one. It goes
 * through the domain rather than being trusted, so a typo in .env surfaces as
 * the setup screen instead of reaching the backend and coming back as "no such
 * profile" — which would send someone looking in the wrong place.
 */
export const resolveInitialSteamId = (raw: string | undefined): string | undefined => {
  const steamId = SteamId.create(raw?.trim() ?? "");
  return steamId.ok ? steamId.value.value : undefined;
};

/** How much of a commit is worth reading: what the release tag and the EAS update message already print. */
const SHORT_SHA_LENGTH = 7;

/** What a build calls itself where it is not the live site. */
const NOT_LIVE = "dev";

/** The one value that claims a build is the live site. Anything else is not a claim. */
const LIVE = "true";

/**
 * What the running JavaScript says about its own origin (ADR-0016): the commit
 * it was built from, preceded by `dev` where the build is not the live site,
 * and `dev` alone where there is no commit to name.
 *
 * Both inputs are build-time env, so both are absent by default — and that is
 * the point: a production workflow that forgets the flag makes production
 * understate itself, a false alarm someone corrects, rather than letting a
 * preview pass for the live site. The flag is read as the word `true` and not
 * as any text at all, so that the one way to write "not live" out loud —
 * `EXPO_PUBLIC_LIVE=false` — is not read as the opposite of itself.
 */
export const resolveRevision = (sha: string | undefined, live: string | undefined): string => {
  const commit = sha?.trim().slice(0, SHORT_SHA_LENGTH);
  if (!commit) return NOT_LIVE;
  return live?.trim() === LIVE ? commit : `${NOT_LIVE} ${commit}`;
};
