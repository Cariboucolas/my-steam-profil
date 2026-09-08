import type { ResponseCache } from "./cache";

/**
 * A cache with the Cloudflare Cache API's shape and a Map behind it: enough to
 * watch what a real one would keep, with no Worker to run inside.
 *
 * Responses are cloned in and out, because a body can only be read once and a
 * test asking twice for the same answer must get an answer both times.
 */
export const mapCache = (): ResponseCache => {
  const entries = new Map<string, Response>();
  return {
    match: (request) => {
      const hit = entries.get(request.url);
      return Promise.resolve(hit ? hit.clone() : undefined);
    },
    put: (request, response) => {
      entries.set(request.url, response.clone());
      return Promise.resolve();
    },
  };
};
