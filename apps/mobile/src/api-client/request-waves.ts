import type { Result } from "@steam/domain";

/**
 * How many requests to have in flight at once, whatever is being asked for.
 *
 * The parallelism deliberately lives on the client rather than on the server: a
 * Worker gets six simultaneous connections and fifty subrequests per
 * invocation, so fanning out server-side cannot cover a library at all, while
 * one request per game keeps every invocation at a single Steam call
 * (ADR-0005).
 *
 * Six matches what a client will open to one host anyway, so a larger number
 * would only queue somewhere less visible. Stated once because it is one
 * budget: two loads each helping themselves to six would halve both.
 */
const CONCURRENT_REQUESTS = 6;

/** What one wave brought back, by appId. A game that failed is absent. */
export type Landed<T> = Readonly<Record<number, T>>;

/**
 * Asks about a list of games a wave at a time, reporting each wave as it lands
 * so a screen fills in rather than staying blank until the last one returns.
 * `keepGoing` is checked between waves, which is where a load is abandoned.
 *
 * A game that fails is left out rather than failing the load: one private or
 * unreachable game should not empty a library. What was asked for is reported
 * alongside what landed, because those two differ exactly then.
 */
export const askInWaves = async <T>(
  appIds: readonly number[],
  ask: (appId: number) => Promise<Result<T, unknown>>,
  onWave: (landed: Landed<T>, asked: readonly number[]) => void,
  keepGoing: () => boolean,
): Promise<void> => {
  for (let start = 0; start < appIds.length; start += CONCURRENT_REQUESTS) {
    if (!keepGoing()) return;

    const wave = appIds.slice(start, start + CONCURRENT_REQUESTS);
    const answers = await Promise.all(
      wave.map(async (appId) => ({ appId, answer: await ask(appId) })),
    );

    const landed: Record<number, T> = {};
    for (const { appId, answer } of answers) {
      if (answer.ok) {
        landed[appId] = answer.value;
      }
    }
    onWave(landed, wave);
  }
};
