import { useMemo } from "react";

import {
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
  type NamedUnlock,
  type NamesByAppId,
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
};

/**
 * The share of the games behind the shown rows that have said what they call
 * their achievements. Phase two is three to six calls with no wave structure to
 * report, so what it reports is the rows it has been able to name.
 */
const namedShare = (
  appIds: readonly number[],
  names: NamesByAppId,
): number | null =>
  appIds.length === 0
    ? null
    : appIds.filter((appId) => names[appId] !== undefined).length / appIds.length;

/**
 * Everything behind the library's Rarest tab, assembled: the two phases, the
 * ranking they feed, and the one share the stats card's load bar draws.
 *
 * Nothing here decides anything a reader sees — `buildRarestUnlocks` and
 * `nameUnlocks` do, and they are pure. This holds the order the two loads have
 * to run in, which is the whole of why the tab is affordable: phase two asks
 * only about the games phase one's ranking turned out to show (#31, ADR-0005).
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
   * Null until the ranking shows something: which games are worth the schema is
   * a property of the answer, so before there is one there is nothing to ask.
   */
  const shown = useMemo<ShownGames | null>(
    () =>
      library === null || appIds.length === 0
        ? null
        : { client: library.client, appIds },
    [library, appIds],
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
  };
};
