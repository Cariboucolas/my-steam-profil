import type { GameDto } from "@steam/contracts";

import type { ApiClient } from "./api-client";
import type { CompletionByAppId } from "../view-models/library";

/**
 * How many tallies to have in flight at once.
 *
 * The parallelism deliberately lives here rather than on the server: a Worker
 * gets six simultaneous connections and fifty subrequests per invocation, so
 * fanning out server-side cannot cover a library at all, while one request per
 * game keeps every invocation at a single Steam call (ADR-0005).
 *
 * Six matches what a client will open to one host anyway, so a larger number
 * would only queue somewhere less visible.
 */
export const CONCURRENT_TALLIES = 6;

/**
 * The games worth spending a request on, most recently played first.
 *
 * A game that was never launched cannot hold an unlock, so asking about it buys
 * a guaranteed zero — 100 of the 367 games on the library this was measured
 * against. Recent first because that is the order a player recognises, so the
 * list fills from the top with the games they came to look at.
 */
export const gamesWorthTallying = (
  games: readonly GameDto[],
): readonly number[] =>
  games
    .filter((game): game is GameDto & { lastPlayedAt: string } =>
      game.lastPlayedAt !== null,
    )
    .slice()
    .sort((a, b) => Date.parse(b.lastPlayedAt) - Date.parse(a.lastPlayedAt))
    .map((game) => game.appId);

export type LoadOptions = {
  readonly concurrency?: number;
  /**
   * Checked between waves. False stops the load where it is — a player who has
   * switched profile or left the screen must not have the previous library's
   * remaining waves land on the new one.
   */
  readonly keepGoing?: () => boolean;
};

/**
 * Fetches a tally per game, a wave at a time, reporting each wave as it lands
 * so the list fills in rather than staying blank until the last one returns.
 *
 * A game that fails is left out rather than failing the load: one private or
 * unreachable game should not empty a library.
 */
export const loadLibraryCompletions = async (
  client: ApiClient,
  appIds: readonly number[],
  /**
   * Given what landed and what was asked for. The two differ when a game
   * fails, and a caller drawing a skeleton per outstanding game needs the
   * second to stop drawing one for a game that is never coming.
   */
  onWave: (loaded: CompletionByAppId, asked: readonly number[]) => void,
  options: LoadOptions = {},
): Promise<void> => {
  const size = options.concurrency ?? CONCURRENT_TALLIES;
  const keepGoing = options.keepGoing ?? (() => true);

  for (let start = 0; start < appIds.length; start += size) {
    if (!keepGoing()) return;

    const wave = appIds.slice(start, start + size);
    const answers = await Promise.all(
      wave.map(async (appId) => ({
        appId,
        tally: await client.getGameCompletion(appId),
      })),
    );

    const landed: Record<number, CompletionByAppId[number]> = {};
    for (const { appId, tally } of answers) {
      if (tally.ok) {
        landed[appId] = tally.value;
      }
    }
    onWave(landed, wave);
  }
};
