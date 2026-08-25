import type { Context } from "hono";

/**
 * Somewhere to keep an answer that is expensive to produce and cheap to reuse.
 *
 * The shape is the Cloudflare Cache API's own, so the Worker implementation is
 * a passthrough and nothing has to be adapted at the platform edge. Routes
 * depend on this rather than on the `caches` global because that global exists
 * on Workers and not under `tsx`, and ADR-0003 keeps platform knowledge in
 * `worker.ts`.
 */
export interface ResponseCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/**
 * The default: remembers nothing. `server.ts` runs with this, because a
 * developer watching a terminal wants to see every call actually happen.
 */
export const noCache: ResponseCache = {
  match: () => Promise.resolve(undefined),
  put: () => Promise.resolve(),
};

/**
 * Five minutes. Long enough to cover the burst of one library open — one
 * request per game the player has ever launched — and short enough that
 * backing out of a game and looking again usually shows a fresh tally.
 *
 * A guess, not a measurement: there is no usage to measure yet (ADR-0005).
 */
export const CACHE_SECONDS = 300;

/** A cached answer is served with mutable headers, so CORS can still be applied. */
const reusable = (response: Response): Response =>
  new Response(response.body, response);

const OK = 200;

/**
 * Serves a handler's answer from the cache when it is there, and stores it when
 * it is not. Only a 200 is stored: a refusal describes a state that can change
 * — a profile can be made public, Steam can come back — and keeping it would
 * outlast the reason for it.
 */
export const cached =
  (cache: ResponseCache, handle: (context: Context) => Promise<Response>) =>
  async (context: Context): Promise<Response> => {
    // The Hono context carries the original Request, which is the cache key:
    // it is the full URL, so it already separates players and games.
    const request = context.req.raw;

    const hit = await cache.match(request);
    if (hit) {
      return reusable(hit);
    }

    const answer = await handle(context);
    if (answer.status !== OK) {
      return answer;
    }

    const storable = reusable(answer);
    storable.headers.set("Cache-Control", `max-age=${CACHE_SECONDS}`);
    await cache.put(request, storable.clone());
    return storable;
  };
