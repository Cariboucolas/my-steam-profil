/**
 * What a target answering means, per target. Kept apart from the fetching so a
 * test can say what came back without a network, and so the two contracts this
 * repository depends on are written down in one place.
 */
export type Outcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export type Check = (response: Response) => Promise<Outcome>;

/** The one body that means healthy. Anything else is down (ADR-0019). */
const HEALTHY = '{"status":"ok"}';

const HTTP_OK = 200;

const alive: Outcome = { ok: true };

/**
 * `apps/api` is healthy when it answers 200 *and* says so.
 *
 * The body matters as much as the status: a Worker started without
 * STEAM_API_KEY answers 503 to every address, `/health` included, and says
 * nothing a caller could use — so reading the status alone would be enough
 * today, and would stop being enough the day the route learns another answer.
 */
export const saysItIsHealthy: Check = async (response) => {
  if (response.status !== HTTP_OK) {
    return { ok: false, reason: `HTTP ${response.status}` };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "body was not JSON" };
  }

  const said = (body as { status?: unknown } | null)?.status;
  return said === "ok" ? alive : { ok: false, reason: `body was not ${HEALTHY}` };
};

/**
 * `apps/alerts` is alive when it refuses the method, which is the only thing it
 * will do for a GET. A Worker that is down cannot refuse anything, so the
 * refusal is proof of life at no cost — and the refusal *exactly*, because a
 * GET route added later must not quietly pass for health (ADR-0019).
 */
export const refusesTheMethod =
  (expected: number): Check =>
  async (response) =>
    response.status === expected
      ? alive
      : { ok: false, reason: `expected HTTP ${expected}, got HTTP ${response.status}` };
