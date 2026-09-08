import type { GameDto } from "@steam/contracts";
import { useCallback, useEffect, useState } from "react";

import type { ApiClient } from "./api-client";
import { askInWaves } from "./request-waves";
import type { TallyByAppId } from "../view-models/library";

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
  game.playtimeMinutes > 0 || game.lastPlayedAt !== null;

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
  return b.playtimeMinutes - a.playtimeMinutes;
};

/**
 * The games worth spending a request on, the ones a player recognises first.
 *
 * A game never opened cannot hold an unlock, so asking about it buys a
 * guaranteed zero — 100 of the 367 games on the library this was measured
 * against.
 */
const gamesWorthTallying = (games: readonly GameDto[]): readonly number[] =>
  games
    .filter(everOpened)
    .sort(recognisedFirst)
    .map((game) => game.appId);

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
};

/**
 * How far a library's tallies have got, from the games it holds. Everything
 * the load needs — the order to fetch in, the waves, their bound, abandoning
 * them when the profile changes, merging what lands and taking it out of the
 * outstanding set, pinning the order and releasing it — lives behind this.
 *
 * Two things are asked of a caller. `games` must keep a stable identity across
 * renders — a fresh array each render restarts the load, so hand over the
 * loaded value or a constant, never a literal. And `games` must be the games
 * that very `client` answered for: the pair is what a load is, and a library
 * held over from a previous profile would be counted against the new one.
 */
export const useLibraryTallies = (
  client: ApiClient | undefined,
  games: readonly GameDto[],
): LibraryTallies => {
  const [tallies, setTallies] = useState<TallyByAppId>(NO_TALLIES);
  const [pending, setPending] = useState<ReadonlySet<number>>(NOTHING_OUTSTANDING);
  /** How many were asked for, which the outstanding set alone cannot say. */
  const [asked, setAsked] = useState(0);
  const [frozenOrder, setFrozenOrder] = useState<readonly number[] | null>(null);
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // A different profile must not be counted with the previous one's tallies
    // while its own load runs. Without this, switching profiles shows one
    // library's numbers against the other's games.
    setTallies(NO_TALLIES);
    setPending(NOTHING_OUTSTANDING);
    setAsked(0);
    setFrozenOrder(null);
    setCounted(false);

    if (client !== undefined) {
      const wanted = gamesWorthTallying(games);
      if (wanted.length === 0) {
        // Nothing worth counting is a library counted through, at once. With
        // no profile at all there is nothing that could be counted, so it
        // stays uncounted and whatever waits on the count keeps waiting.
        setCounted(true);
      } else {
        setPending(new Set(wanted));
        setAsked(wanted.length);
        setFrozenOrder(wanted);

        void (async () => {
          await askInWaves(
            wanted,
            (appId) => client.getGameTally(appId),
            (landed, asked) => {
              if (cancelled) return;
              setTallies((known) => ({ ...known, ...landed }));
              // Cleared for everything asked, not just what landed: a game that
              // failed is not coming, and must stop pulsing.
              setPending((waiting) => {
                const left = new Set(waiting);
                for (const appId of asked) left.delete(appId);
                return left;
              });
            },
            () => !cancelled,
          );

          if (!cancelled) {
            // Everything that is coming has come: the chosen order applies
            // again, and the library is counted through.
            setFrozenOrder(null);
            setCounted(true);
          }
        })();
      }
    }

    // Stops the waves where they are, and guards against one landing on a
    // library that is no longer shown.
    return () => {
      cancelled = true;
    };
  }, [client, games]);

  const repin = useCallback((order: readonly number[]) => {
    setFrozenOrder((pinned) => (pinned === null ? null : order));
  }, []);

  const loaded = pending.size === 0 ? null : (asked - pending.size) / asked;

  return { tallies, pending, loaded, counted, frozenOrder, repin };
};
