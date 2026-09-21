import { SteamGatewayError } from "../steam/steam-gateway";

/** What a Worker that nothing deployed can honestly call itself (ADR-0016). */
const NOT_DEPLOYED = "dev";

/** Whose failure it was: Steam let us down, or we did. */
export type FailureKind = "steam" | "internal";

/** One failure, said in fields rather than in a sentence. */
export type FailureReport = {
  readonly revision: string;
  readonly method: string;
  readonly path: string;
  readonly kind: FailureKind;
  readonly error: string;
  readonly detail: string;
};

/**
 * What the log says when a request fails.
 *
 * Workers Logs has been on since the Worker's first deploy, so a 503 was never
 * invisible — it was unattributable. A line saying a request failed, with no
 * revision beside it, answers none of the questions asked next: which build,
 * which profile, whose fault.
 *
 * Fields rather than a sentence, because Cloudflare indexes the structure: an
 * object reaches the log queryable, where an interpolated string arrives as
 * text somebody has to read in full.
 *
 * The path is kept whole, SteamID included. That is the decision of ADR-0017
 * and not an oversight — it is what makes a failure reproducible, and the same
 * address has been in Cloudflare's invocation logs all along. The query string
 * is dropped: it carries ordering, which the path already implies.
 */
export const describeFailure = (
  revision: string | undefined,
  request: { readonly method: string; readonly url: string },
  error: unknown,
): FailureReport => ({
  revision: revision?.trim() || NOT_DEPLOYED,
  method: request.method,
  path: new URL(request.url).pathname,
  kind: error instanceof SteamGatewayError ? "steam" : "internal",
  error: error instanceof Error ? error.name : typeof error,
  detail: error instanceof Error ? error.message : String(error),
});
