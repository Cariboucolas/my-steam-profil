import type { GameDto } from "@steam/contracts";

import type { ApiClient } from "./api-client";
import type { ProgressByAppId } from "../view-models/library";

/**
 * Loads completion for the handful of games a player touched most recently.
 *
 * Progress costs one call per game, so the library screen cannot have it for
 * everything — nor should it, since a library runs to hundreds of titles. The
 * rows it could not load show a dash, which is the state the design already
 * draws for a game with nothing to earn.
 *
 * A game that fails is left out rather than failing the screen: one private or
 * unreachable game should not empty the whole list.
 */
export const loadLibraryProgress = async (
  client: ApiClient,
  games: readonly GameDto[],
  limit: number,
): Promise<ProgressByAppId> => {
  const played = games
    .filter((game): game is GameDto & { lastPlayedAt: string } =>
      game.lastPlayedAt !== null,
    )
    .sort((a, b) => Date.parse(b.lastPlayedAt) - Date.parse(a.lastPlayedAt))
    .slice(0, limit);

  const answers = await Promise.all(
    played.map(async (game) => ({
      appId: game.appId,
      progress: await client.getGameProgress(game.appId),
    })),
  );

  const loaded: Record<number, ProgressByAppId[number]> = {};
  for (const { appId, progress } of answers) {
    if (progress.ok) {
      loaded[appId] = progress.value;
    }
  }
  return loaded;
};
