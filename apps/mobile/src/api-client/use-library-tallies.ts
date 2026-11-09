import type { GameDto, GameTallyDto } from "@steam/contracts";
import type { Result } from "@steam/domain";
import { type QueryClient, type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { askThroughCache } from "../query/ask-through-cache";
import { queries } from "../query/queries";
import { longestFirst, type TallyByAppId } from "../view-models/library";
import type { ApiClient } from "./api-client";
import { gamesQuery } from "./games-query";
import { askInWaves } from "./request-waves";

/** Shared, so resetting a library that is already empty re-renders nothing. */
const NO_TALLIES: TallyByAppId = {};
const NOTHING_OUTSTANDING: ReadonlySet<number> = new Set();

/**
 * Whether the player has ever opened a game, and so whether it can hold an
 * unlock at all.
 *
 * Playtime first, and the date only as a second chance: Steam does not always
 * send a last-played time. On the public profile 76561197997989573 not one of
 * its 99 games carries one, while 80 of them carry playtime — 149 hours on the
 * heaviest. Reading that absence as "never launched" asked for no tally at all
 * and left every row of that library blank.
 */
const everOpened = (game: GameDto): boolean =>
  (game.playtimeMinutes !== null && game.playtimeMinutes > 0) || game.lastPlayedAt !== null;

/**
 * Most recently played first, because that is the order a player recognises, so
 * the list fills from the top with the games they came to look at.
 *
 * Where Steam withholds the date, the longest played comes first instead — the
 * nearest thing to recognition that is actually there. A game that has a date
 * always outranks one that has none, so a real order is never displaced by a
 * stand-in.
 */
const playedAt = (game: GameDto): number | null =>
  game.lastPlayedAt === null ? null : Date.parse(game.lastPlayedAt);

const recognisedFirst = (a: GameDto, b: GameDto): number => {
  const [left, right] = [playedAt(a), playedAt(b)];
  if (left !== null && right !== null) return right - left;
  if (left !== null) return -1;
  if (right !== null) return 1;
  return longestFirst(a, b);
};

/**
 * The games worth spending a request on, the ones a player recognises first.
 *
 * A game never opened cannot hold an unlock, so asking about it buys a
 * guaranteed zero — 100 of the 367 games on the library this was measured
 * against.
 *
 * That holds only while Steam is saying something. Playtime is governed by its
 * own privacy setting, separate from the one over achievements, so a profile
 * can withhold every hour it has played and still publish every unlock: on the
 * public profile 76561197985221153 all 100 games carry neither playtime nor a
 * last-played time, and Counter-Strike: Source still answers 57 of 147, dated
 * 2010 to 2014. There the hours arrive absent rather than as zeroes, so no
 * game passes the filter and every one of them is counted instead.
 */
const gamesWorthTallying = (games: readonly GameDto[]): readonly number[] => {
  const opened = games.filter(everOpened);
  return (opened.length === 0 ? games : opened)
    .slice()
    .sort(recognisedFirst)
    .map((game) => game.appId);
};

/** Where a library's tallies have got to, and the levers over that. */
export type LibraryTallies = {
  /** Every tally that has landed. Absent means "not counted", not "none". */
  readonly tallies: TallyByAppId;
  /** Games whose tally has been asked for and has not come back: they pulse. */
  readonly pending: ReadonlySet<number>;
  /**
   * Whether this library has been counted through: every game worth a tally
   * asked, and every answer either landed or failed. False while no profile is
   * chosen, and false again the moment another library takes this one's place.
   *
   * Nothing is outstanding either side of a load, so `pending` alone cannot
   * tell a count that has not started from one that is over. What waits on the
   * difference is the rarest-unlocks tab: it needs to know which games hold an
   * unlock, which is what the waves deliver, and it fetches under the same six
   * connections, which is what they must be done with.
   */
  readonly counted: boolean;
  /**
   * The share of the tallies asked for that have come back, between 0 and 1,
   * or null while nothing is outstanding. Null covers both silences — before a
   * library has anything to count, and once everything has landed — because a
   * load nobody is waiting on has nothing to report.
   */
  readonly loaded: number | null;
  /**
   * While tallies arrive, the order the list is pinned to. The default order
   * depends on tallies, so without this every wave would shuffle rows under
   * the reader's finger. Null once nothing is outstanding.
   */
  readonly frozenOrder: readonly number[] | null;
  /**
   * Pins the list to an order the reader has just chosen, so the waves still
   * arriving do not carry on shuffling it. Does nothing once nothing is
   * outstanding: with no wave left to move anything, the chosen order already
   * holds.
   */
  repin(order: readonly number[]): void;
  /**
   * The Games to draw. The list handed in, except during a Recount, when a
   * Game gone from the new list keeps its row until the order is released.
   */
  readonly games: readonly GameDto[];
  /** True from the moment a Recount starts until its list of Games is back. */
  readonly refreshing: boolean;
  /** Whether the last Recount could not load the list of Games. */
  readonly recountFailed: boolean;
  /**
   * Starts a Recount (#164): the list of Games and every tally are asked
   * again, past the cache, while the list stays pinned to `order` — the order
   * on screen — with any Game new to it at the bottom. Does nothing while a
   * count, first or Recount, is still running.
   */
  recount(order: readonly number[]): void;
};

/** One Game's tally, through the cache above the routes; `again` past it. */
const askTally = (
  cache: QueryClient,
  steamId: string,
  client: ApiClient,
  appId: number,
  again = false,
): Promise<Result<GameTallyDto, unknown>> =>
  askThroughCache(
    cache,
    queries.tally(steamId, appId),
    (signal) => client.getGameTally(appId, signal),
    { again },
  );

/** The Game a tally key names, when it is one of `steamId`'s tallies. */
const tallyOf = (key: QueryKey, steamId: string): number | null => {
  const [kind, owner, appId] = key;
  return kind === "tally" && owner === steamId && typeof appId === "number" ? appId : null;
};

/**
 * The rows a Recount draws: every Game shown before it, as the new list
 * describes it where it still holds it, then the Games new to the list.
 */
const keptAlongside = (shown: readonly GameDto[], next: readonly GameDto[]): readonly GameDto[] => {
  const latest = new Map(next.map((game) => [game.appId, game]));
  const before = new Set(shown.map((game) => game.appId));
  return [
    ...shown.map((game) => latest.get(game.appId) ?? game),
    ...next.filter((game) => !before.has(game.appId)),
  ];
};

/** `order`, then every Game of `games` it does not name yet. */
const pinnedWithNewcomers = (
  order: readonly number[],
  games: readonly GameDto[],
): readonly number[] => {
  const named = new Set(order);
  return [...order, ...games.map((game) => game.appId).filter((appId) => !named.has(appId))];
};

/**
 * The list of Games asked of the backend again, and kept under the key the
 * page reads; null when it could not be had. Asked directly rather than
 * refetched in the cache: a list that fails here must leave the one the page
 * reads as it was, or the full error screen would replace the library shown.
 */
const askListAgain = async (
  cache: QueryClient,
  steamId: string,
  client: ApiClient,
): Promise<readonly GameDto[] | null> => {
  const { queryKey } = gamesQuery(steamId, client);
  try {
    const answer = await client.getGames();
    if (!answer.ok) return null;
    cache.setQueryData(queryKey, answer.value);
    // Read back: the cache's copy is the array the page is handed.
    return cache.getQueryData(queryKey) ?? answer.value;
  } catch {
    // A list that could not be reached is told the player as one that failed.
    return null;
  }
};

/** The library a count is of: the effect does not start a second one for it. */
type CountedOf = {
  readonly steamId: string | undefined;
  readonly client: ApiClient | undefined;
  readonly games: readonly GameDto[] | null;
};

/**
 * How far a library's tallies have got, from the games it holds. Everything
 * the load needs — the order to fetch in, the waves, abandoning them when the
 * profile changes, merging what lands and taking it out of the outstanding
 * set, pinning the order and releasing it — lives behind this, and so does a
 * Recount (#164).
 *
 * Every tally is read through the cache above the routes (#162), so another
 * screen asks nothing for what this one counted, and a library left mid-count
 * asks only for what is missing when it comes back. The waves stay: one
 * render per wave of six is what keeps the list smooth while it counts, which
 * one render per tally was measured not to (#168).
 *
 * A new `games` array of the same Profile keeps the tallies already known and
 * counts the new list on top of them; another Profile starts from nothing.
 *
 * Three things are asked of a caller. `games` must keep a stable identity
 * across renders — a fresh array each render restarts the load, so hand over
 * the loaded value or a constant, never a literal. `games` must be the games
 * `steamId` owns, and `client` the client of `steamId`: a library held over
 * from a previous profile would be counted against the new one. And `games`
 * must be read from the cache's Games query, which a Recount asks again: the
 * library is counted through once that new list has been handed in.
 */
export const useLibraryTallies = (
  steamId: string | undefined,
  client: ApiClient | undefined,
  games: readonly GameDto[],
): LibraryTallies => {
  const cache = useQueryClient();
  const [tallies, setTallies] = useState<TallyByAppId>(NO_TALLIES);
  const [pending, setPending] = useState<ReadonlySet<number>>(NOTHING_OUTSTANDING);
  /** How many were asked for, which the outstanding set alone cannot say. */
  const [asked, setAsked] = useState(0);
  const [frozenOrder, setFrozenOrder] = useState<readonly number[] | null>(null);
  const [counted, setCounted] = useState(false);
  /**
   * The library everything above belongs to. The reset below runs in an
   * effect, after the render that first hands over another library, so that
   * render must not read the previous one's state against the new games.
   */
  const [heldFor, setHeldFor] = useState({ steamId, games });
  /** During a Recount, the rows drawn: what was shown and what is new. */
  const [kept, setKept] = useState<readonly GameDto[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recountFailed, setRecountFailed] = useState(false);

  /** Moved on by every count that starts, so the one before stops between waves. */
  const generation = useRef(0);
  /** Whether a count, first or Recount, is running: a pull meanwhile is ignored. */
  const counting = useRef(false);
  /**
   * Whether a Recount is waiting on its list of Games. The cache may hand that
   * list to the page before the Recount reads it, and the Recount counts it.
   */
  const askingForList = useRef(false);
  const mounted = useRef(true);
  const countedOf = useRef<CountedOf | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Asks `wanted` in waves into the tallies, for as long as count `mine` is the latest. */
  const countInWaves = useCallback(
    async (
      library: { readonly steamId: string; readonly client: ApiClient },
      wanted: readonly number[],
      mine: number,
      again: boolean,
    ) => {
      const live = () => mounted.current && generation.current === mine;
      await askInWaves(
        wanted,
        (appId) => askTally(cache, library.steamId, library.client, appId, again),
        (landed, askedInWave) => {
          if (!live()) return;
          // A tally that failed is absent from `landed`, so the one it had stays.
          setTallies((known) => ({ ...known, ...landed }));
          // Cleared for everything asked, not just what landed: a game that
          // failed is not coming, and must stop pulsing.
          setPending((waiting) => {
            const left = new Set(waiting);
            for (const appId of askedInWave) left.delete(appId);
            return left;
          });
        },
        live,
      );

      if (live()) {
        // Everything that is coming has come: the chosen order applies again,
        // a Game gone from the list goes, and the library is counted through.
        counting.current = false;
        setFrozenOrder(null);
        setKept(null);
        setCounted(true);
      }
    },
    [cache],
  );

  /** Marks `wanted` outstanding, pins the list to `order`, and counts. */
  const startCount = useCallback(
    (
      library: { readonly steamId: string; readonly client: ApiClient },
      wanted: readonly number[],
      order: readonly number[],
      mine: number,
      again: boolean,
    ) => {
      counting.current = true;
      setPending(new Set(wanted));
      setAsked(wanted.length);
      setFrozenOrder(order);
      return countInWaves(library, wanted, mine, again);
    },
    [countInWaves],
  );

  useEffect(() => {
    const last = countedOf.current;
    if (
      last !== null &&
      last.steamId === steamId &&
      last.client === client &&
      last.games === games
    ) {
      // A Recount already counts this list.
      return;
    }
    const sameProfile = last !== null && last.steamId === steamId;
    if (sameProfile && askingForList.current) return;
    generation.current += 1;
    const mine = generation.current;
    countedOf.current = { steamId, client, games };
    counting.current = false;

    // A different profile must not be counted with the previous one's tallies
    // while its own load runs. Without this, switching profiles shows one
    // library's numbers against the other's games.
    if (!sameProfile) {
      setTallies(NO_TALLIES);
      setRecountFailed(false);
    }
    setPending(NOTHING_OUTSTANDING);
    setAsked(0);
    setFrozenOrder(null);
    setCounted(false);
    setKept(null);
    setRefreshing(false);
    setHeldFor({ steamId, games });

    if (steamId !== undefined && client !== undefined) {
      const wanted = gamesWorthTallying(games);
      if (wanted.length === 0) {
        // Nothing worth counting is a library counted through, at once. With
        // no profile at all there is nothing that could be counted, so it
        // stays uncounted and whatever waits on the count keeps waiting.
        setCounted(true);
      } else {
        void startCount({ steamId, client }, wanted, wanted, mine, false);
      }
    }

    // Stops the waves where they are, and guards against one landing on a
    // library that is no longer shown. A wave already in flight still lands in
    // the cache, where the next visit finds it. A Recount started since owns
    // the count, and is left alone.
    return () => {
      if (generation.current !== mine) return;
      generation.current += 1;
      counting.current = false;
      countedOf.current = { steamId, client, games: null };
    };
  }, [steamId, client, games, startCount]);

  // A game opened from the library marks its tally out of date when its
  // GameProgress lands (#167), while the library is still mounted beneath it.
  // That one tally is asked again — not the library — and replaces the one
  // shown without pulsing: it is a figure refreshed, not a library counted.
  useEffect(() => {
    if (steamId === undefined || client === undefined) return;
    let cancelled = false;

    const unsubscribe = cache.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "invalidate") return;
      const appId = tallyOf(event.query.queryKey, steamId);
      if (appId === null) return;

      void askTally(cache, steamId, client, appId).then((answer) => {
        if (!cancelled && answer.ok) {
          setTallies((known) => ({ ...known, [appId]: answer.value }));
        }
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [cache, steamId, client]);

  const repin = useCallback((order: readonly number[]) => {
    setFrozenOrder((pinned) => (pinned === null ? null : order));
  }, []);

  const recount = useCallback(
    (order: readonly number[]) => {
      if (steamId === undefined || client === undefined || counting.current) return;
      generation.current += 1;
      const mine = generation.current;
      const live = () => mounted.current && generation.current === mine;
      const shown = games;
      counting.current = true;
      askingForList.current = true;
      setRefreshing(true);
      setCounted(false);

      void (async () => {
        const next = await askListAgain(cache, steamId, client);
        askingForList.current = false;
        if (!live()) return;
        if (next === null) {
          // The library shown stays as it was; the player is told, and may pull again.
          counting.current = false;
          setRefreshing(false);
          setRecountFailed(true);
          setCounted(true);
          return;
        }

        const wanted = gamesWorthTallying(next);
        countedOf.current = { steamId, client, games: next };
        setHeldFor({ steamId, games: next });
        setKept(keptAlongside(shown, next));
        setRefreshing(false);
        setRecountFailed(false);
        await startCount({ steamId, client }, wanted, pinnedWithNewcomers(order, next), mine, true);
      })();
    },
    [cache, steamId, client, games, startCount],
  );

  if (heldFor.steamId !== steamId) {
    return {
      tallies: NO_TALLIES,
      pending: NOTHING_OUTSTANDING,
      loaded: null,
      counted: false,
      frozenOrder: null,
      repin,
      games,
      refreshing: false,
      recountFailed: false,
      recount,
    };
  }

  const loaded = pending.size === 0 ? null : (asked - pending.size) / asked;

  return {
    tallies,
    pending,
    loaded,
    // A list handed in that no count has reached yet is not counted through.
    counted: counted && heldFor.games === games,
    frozenOrder,
    repin,
    games: kept ?? games,
    refreshing,
    recountFailed,
    recount,
  };
};
