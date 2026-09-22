import { saysItIsHealthy, refusesTheMethod, type Check } from "./checks";
import type { NonEmpty } from "./decision";

/**
 * What is watched. Both are Workers of ours, and neither can report its own
 * absence — which is the whole reason this exists (ADR-0019).
 */
export type Target = {
  /** How it is named in an alert and in the title of its incident. */
  readonly name: string;
  readonly url: string;
  readonly check: Check;
};

/** The method `apps/alerts` refuses, which is every method but POST. */
const METHOD_NOT_ALLOWED = 405;

const withoutTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

export const targetsOf = (apiUrl: string, alertsUrl: string): NonEmpty<Target> => [
  {
    name: "apps/api",
    url: `${withoutTrailingSlash(apiUrl)}/health`,
    check: saysItIsHealthy,
  },
  {
    name: "apps/alerts",
    url: withoutTrailingSlash(alertsUrl),
    check: refusesTheMethod(METHOD_NOT_ALLOWED),
  },
];
