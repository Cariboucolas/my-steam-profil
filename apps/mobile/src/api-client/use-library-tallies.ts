import type { GameDto, GameTallyDto } from "@steam/contracts";
import { type QueryObserverResult, useQueries } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { NOBODY, queries } from "../query/queries";
import { valueOrThrow } from "../query/value-or-throw";
import { longestFirst, type TallyByAppId } from "../view-models/library";
import type { ApiClient } from "./api-client";

/** Shared, so a library with nothing landed re-renders nothing. */
const NO_TALLIES: TallyByAppId = {};
const NOTHING_OUTSTANDING: ReadonlySet<number> = new Set();
const NOTHING_TO_ASK: readonly number[] = [];

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

/** Where a library's tallies have got to, and the one lever over that. */
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
   * unlock, which is what the tallies deliver, and it fetches under the same six
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
   * depends on tallies, so without this every one landing would shuffle rows
   * under the reader's finger. Null once nothing is outstanding.
   */
  readonly frozenOrder: readonly number[] | null;
  /**
   * Pins the list to an order the reader has just chosen, so the tallies still
   * arriving do not carry on shuffling it. Does nothing once nothing is
   * outstanding: with no tally left to move anything, the chosen order already
   * holds.
   */
  repin(order: readonly number[]): void;
};

/** What has come back of a library's tallies, and what is still on its way. */
type Landing = Pick<LibraryTallies, "tallies" | "pending">;

/**
 * Reads the tally queries of `wanted`, which are in the same order. A game
 * that failed is in neither: nothing is coming for it, so it stops pulsing.
 * A tally asked again over one already shown is not outstanding either: it is
 * a figure being refreshed, not a library being counted.
 */
const landingOf =
  (wanted: readonly number[]) =>
  (results: readonly QueryObserverResult<GameTallyDto>[]): Landing => {
    const tallies: Record<number, GameTallyDto> = {};
    const pending = new Set<number>();
    wanted.forEach((appId, index) => {
      const result = results[index];
      if (result?.data !== undefined) {
        tallies[appId] = result.data;
      } else if (result?.isPending) {
        pending.add(appId);
      }
    });
    return {
      tallies: Object.keys(tallies).length === 0 ? NO_TALLIES : tallies,
      pending: pending.size === 0 ? NOTHING_OUTSTANDING : pending,
    };
  };

/** An order the reader chose, and the games being counted when they chose it. */
type Chosen = { readonly whileCounting: readonly number[]; readonly order: readonly number[] };

/**
 * How far a library's tallies have got, from the games it holds: one query per
 * game worth a tally, kept in the cache above the routes (#162), so another
 * screen reading them asks nothing, and a library left mid-count asks only for
 * what is missing when it comes back.
 *
 * The queries mount in the order a player recognises, and so are asked in it.
 * Pacing them is the client's: every request waits for one of six places
 * there. Leaving the library, or choosing another profile, cancels what was
 * still waiting, and the profile's SteamId in every key keeps one library's
 * tallies off another's.
 *
 * Two things are asked of a caller. `games` must keep a stable identity across
 * renders — a fresh array each render re-reads every query, so hand over the
 * loaded value or a constant, never a literal. And `games` must be the games
 * `steamId` owns, and `client` the client of `steamId`: a library held over
 * from a previous profile would be counted against the new one.
 */
export const useLibraryTallies = (
  steamId: string | undefined,
  client: ApiClient | undefined,
  games: readonly GameDto[],
): LibraryTallies => {
  const wanted = useMemo(
    () => (client === undefined ? NOTHING_TO_ASK : gamesWorthTallying(games)),
    [client, games],
  );

  const { tallies, pending } = useQueries({
    queries:
      client === undefined
        ? []
        : wanted.map((appId) => ({
            ...queries.tally(steamId ?? NOBODY, appId),
            queryFn: ({ signal }: { readonly signal: AbortSignal }) =>
              client.getGameTally(appId, signal).then(valueOrThrow),
          })),
    combine: useMemo(() => landingOf(wanted), [wanted]),
  });

  const [chosen, setChosen] = useState<Chosen | null>(null);
  const outstanding = pending.size > 0;

  const repin = useCallback(
    (order: readonly number[]) => {
      if (outstanding) setChosen({ whileCounting: wanted, order });
    },
    [outstanding, wanted],
  );

  // Nothing worth counting is a library counted through, at once. With no
  // profile at all there is nothing that could be counted, so it stays
  // uncounted and whatever waits on the count keeps waiting.
  const counted = client !== undefined && !outstanding;
  const chosenOrder = chosen?.whileCounting === wanted ? chosen.order : null;
  const frozenOrder = outstanding ? (chosenOrder ?? wanted) : null;
  const loaded = outstanding ? (wanted.length - pending.size) / wanted.length : null;

  return { tallies, pending, loaded, counted, frozenOrder, repin };
};
