import { useEffect, useRef, useState } from "react";

import type { ApiClient } from "./api-client";
import { askInWaves } from "./request-waves";
import type { NamesByAppId } from "../view-models/rarest-unlocks";

/** Shared, so a load that learns nothing re-renders nothing. */
const NO_NAMES: NamesByAppId = {};

/**
 * The games carrying the rows a ranking actually shows, and the client that
 * ranked them.
 *
 * The two travel together for the reason the counted library does: names
 * fetched with one player's client would name another player's rows after
 * achievements they never unlocked. A caller with no ranking yet — the tab
 * unopened, or the figures still landing — hands over null.
 */
export type ShownGames = {
  readonly client: ApiClient;
  /** Three to six of them, read off the rows with `gamesShownIn`. */
  readonly appIds: readonly number[];
};

export type ShownAchievementNames = {
  /**
   * How each game names its achievements, by appId. A game absent has not been
   * asked about yet, or could not be named; either way its rows keep the
   * apiName they were ranked under.
   */
  readonly names: NamesByAppId;
  /** An answer is outstanding: some row on screen is still to be named. */
  readonly loading: boolean;
};

/**
 * Phase two of the rarest-unlocks tab: what the three to six games behind the
 * shown rows call the achievements in them.
 *
 * Behind this is the game schema, the 253 KB payload ADR-0005 removed from the
 * library's hot path. It is affordable here and nowhere else, and only because
 * the ranking has already been decided: which games are worth it is a property
 * of the answer, so this can never run before there is one (#31).
 *
 * A game is asked about once and then never again while the player lasts —
 * including one that could not answer, whose rows keep the apiName they were
 * ranked under. The ranking is rebuilt on every render it is drawn in, and the
 * set of games it shows grows as figures land, so what has been asked is
 * remembered and each change asks only about what it added.
 */
export const useShownAchievementNames = (
  shown: ShownGames | null,
): ShownAchievementNames => {
  const [names, setNames] = useState<NamesByAppId>(NO_NAMES);
  const [loading, setLoading] = useState(false);

  const client = shown?.client ?? null;
  const appIds = shown?.appIds ?? [];
  /**
   * The identity of a ranking's games rather than of the object holding them: a
   * ranking is rebuilt on every render, so a fresh array must not restart a
   * load — only a different set of games may.
   */
  const wanted = appIds.join(",");

  /**
   * What has been asked about, kept out of state on purpose: every wave this
   * load lands would otherwise restart the effect that is landing it.
   */
  const asked = useRef<Set<number>>(new Set());

  /**
   * What every load in flight for this player shares: whether it is still
   * wanted, and how many of them are running.
   *
   * The flag belongs to the player rather than to a run of the effect below,
   * which is the whole of what makes a growing ranking safe. A ranking gains a
   * game as figures land, and a load abandoned then would be a game marked
   * asked whose answer was thrown away — its rows left under the apiName Steam
   * had already named. Only a new player, or a reader who has left, cancels.
   */
  const live = useRef({ cancelled: false, running: 0 });

  useEffect(() => {
    // A new player is a new library: nothing learned about one names the other.
    const forThisPlayer = { cancelled: false, running: 0 };
    live.current = forThisPlayer;
    asked.current = new Set();
    setNames(NO_NAMES);
    setLoading(false);

    return () => {
      forThisPlayer.cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    const missing =
      client === null
        ? []
        : appIds.filter((appId) => !asked.current.has(appId));

    if (client === null || missing.length === 0) return;

    for (const appId of missing) asked.current.add(appId);

    const load = live.current;
    load.running += 1;
    setLoading(true);

    void (async () => {
      await askInWaves(
        missing,
        (appId) => client.getAchievementNames(appId),
        (landed) => {
          if (load.cancelled) return;
          setNames((known) => ({ ...known, ...landed }));
        },
        () => !load.cancelled,
      );

      load.running -= 1;
      // The last load standing turns the bar off; an earlier one would turn it
      // off under the load that the growing ranking started after it.
      if (!load.cancelled && load.running === 0) setLoading(false);
    })();
    // `wanted` stands in for `appIds`, whose identity changes on every render.
  }, [client, wanted]);

  return { names, loading };
};
