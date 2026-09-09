import { useMemo } from "react";

import {
  gamesHoldingAnUnlock,
  useLibraryRarity,
  type CountedLibrary,
  type RarityStatus,
} from "../api-client/use-library-rarity";
import {
  useShownAchievementNames,
  type ShownGames,
} from "../api-client/use-shown-achievement-names";
import type { LibraryView } from "./library";
import {
  buildRarestUnlocks,
  gamesShownIn,
  nameUnlocks,
  namedShare,
  type NamedUnlock,
} from "./rarest-unlocks";

export type RarestTab = {
  /**
   * Where the ranking stands. It is phase one's, because phase one is what
   * decides whether there is anything to rank: naming a row cannot add one, and
   * an empty list is only news once every figure is in.
   */
  readonly status: RarityStatus;
  /** Rarest first, named and iconed where their games have said. */
  readonly rows: readonly NamedUnlock[];
  /** `rarest 10 across 214 games counted`, and what it excludes. */
  readonly countedLabel: string;
  /**
   * How far whichever phase is running has got, between 0 and 1, or null when
   * nobody is waiting on either. One figure for both, so the tab draws one load
   * bar: a second bar for phase two would announce a second wait, when what the
   * reader is waiting on throughout is one answer.
   */
  readonly loaded: number | null;
  /**
   * Whether the counted library holds an unlock at all.
   *
   * An empty ranking means two different things and only one of them is about
   * the player: a library with nothing unlocked in it, and a library Steam
   * publishes no figure for. Telling the second player they have unlocked
   * nothing would be a plain untruth — they are the ones holding the trophies.
   */
  readonly anyUnlock: boolean;
};

/**
 * Everything behind the library's Rarest tab, assembled: the two phases, the
 * ranking they feed, and the one share the stats card's load bar draws.
 *
 * Nothing here decides anything a reader sees — `buildRarestUnlocks` and
 * `nameUnlocks` do, and they are pure. This holds the order the two loads have
 * to run in, which is the whole of why the tab is affordable: phase two asks
 * only about the games phase one's finished ranking shows (#31, ADR-0005).
 *
 * `library` is null for as long as there is nothing counted to rank, and must
 * keep a stable identity across renders — the loads are started off it.
 */
export const useRarestTab = (
  library: CountedLibrary | null,
  view: LibraryView,
  active: boolean,
): RarestTab => {
  const { rarity, status, loaded } = useLibraryRarity(library, active);

  const ranking = useMemo(
    () => buildRarestUnlocks(view, rarity),
    [view, rarity],
  );
  const appIds = useMemo(() => gamesShownIn(ranking.rows), [ranking.rows]);

  /**
   * Null until phase one is through, and not merely until it has ranked
   * something.
   *
   * A ranking is rebuilt on every wave of figures, so a load half-way through
   * shows whatever the waves so far happened to hold — and every game it passes
   * through is asked for and remembered. Arming this on a partial ranking would
   * spend the 253 KB schema on games that then drop out of it, which is the
   * cost ADR-0005 took off this screen in the first place.
   */
  const shown = useMemo<ShownGames | null>(
    () =>
      library === null || status !== "ready" || appIds.length === 0
        ? null
        : { client: library.client, appIds },
    [library, status, appIds],
  );
  const { names, loading } = useShownAchievementNames(shown);

  const rows = useMemo(
    () => nameUnlocks(ranking.rows, names),
    [ranking.rows, names],
  );

  return {
    status,
    rows,
    countedLabel: ranking.countedLabel,
    // Phase one first: it cannot be running at the same time as phase two,
    // which has nothing to be asked about until phase one's ranking exists.
    loaded: loaded ?? (loading ? namedShare(appIds, names) : null),
    anyUnlock:
      library !== null && gamesHoldingAnUnlock(library.tallies).length > 0,
  };
};
