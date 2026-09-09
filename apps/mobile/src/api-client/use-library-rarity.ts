import { useEffect, useState } from "react";

import type { ApiClient } from "./api-client";
import { askInWaves } from "./request-waves";
import type { TallyByAppId } from "../view-models/library";
import type { RarityByAppId } from "../view-models/rarest-unlocks";

/** Shared, so resetting a tab that has fetched nothing re-renders nothing. */
const NO_RARITY: RarityByAppId = {};

/** How much of a load has been asked for and how much has come back. */
type Progress = {
  readonly asked: number;
  /**
   * How many of those are no longer coming — the ones that landed and the ones
   * that failed alike, since neither is worth waiting for any longer.
   */
  readonly answered: number;
  /**
   * Every answer that is coming has come. Not the same as nothing outstanding:
   * a load that has not started has nothing outstanding either.
   */
  readonly done: boolean;
};

const NOTHING_ASKED: Progress = { asked: 0, answered: 0, done: false };

/**
 * A library that has been counted through, and the client that counted it.
 *
 * The two travel together because either alone is a way to get this wrong: the
 * tallies say which games hold an unlock, and asking about them with anyone
 * else's client would cross one player's library with another's answers. A
 * caller with no such pair yet — no profile, or a count still running — hands
 * over null, which is the whole of the waiting condition.
 */
export type CountedLibrary = {
  readonly client: ApiClient;
  readonly tallies: TallyByAppId;
};

/**
 * Where the rarest-unlocks tab stands. Four states because three of them are
 * silences that must not look alike: a tab nobody has opened, a tab waiting on
 * the count, and a tab that has its answer and found nothing to rank.
 */
export type RarityStatus =
  /** The tab has never been opened, and nothing has been asked for. */
  | "idle"
  /** Opened, and waiting for the library to finish being counted. */
  | "counting"
  /** Answers are on their way. */
  | "loading"
  /** Everything that is coming has come. */
  | "ready";

export type LibraryRarity = {
  /**
   * What Steam publishes, by appId. Absent means the game was never asked
   * about or its answer failed; an empty list means Steam publishes nothing
   * about it. The ranking excludes both, and only one of them is news.
   */
  readonly rarity: RarityByAppId;
  readonly status: RarityStatus;
  /**
   * The share of the answers asked for that have come back, between 0 and 1,
   * or null while nothing is outstanding — before a load and once it is over,
   * because a load nobody is waiting on has nothing to report.
   */
  readonly loaded: number | null;
};

/**
 * The three silences told apart. With nothing armed, what the tab is waiting
 * on is the reader if they have not opened it, and the count if they have.
 */
const statusOf = (
  armed: CountedLibrary | null,
  active: boolean,
  library: CountedLibrary | null,
  done: boolean,
): RarityStatus => {
  if (armed !== null) return done ? "ready" : "loading";
  if (!active) return "idle";
  return library === null ? "counting" : "loading";
};

/**
 * The games worth asking about: the ones holding at least one unlock.
 *
 * No game is excluded by playtime. The rarest unlock hides statistically in a
 * game the player barely touched, so bounding the load by playtime would
 * destroy the answer the tab exists to give. What bounds it instead is holding
 * an unlock at all — a game with none has nothing that could be ranked.
 *
 * The order is nobody's: unlike the tallies, no row on screen is waiting on a
 * particular game, and the ranking is only true once every answer is in.
 */
export const gamesHoldingAnUnlock = (
  tallies: TallyByAppId,
): readonly number[] =>
  Object.entries(tallies)
    .filter(([, tally]) => tally.unlocks.length > 0)
    .map(([appId]) => Number(appId));

/**
 * What Steam publishes about the games a counted library holds unlocks in —
 * phase one of the rarest-unlocks tab, and the half of that ranking the player
 * cannot supply.
 *
 * It never starts on its own. Two things have to be true: the reader has
 * opened the tab, and the library has been counted through. The count is not
 * politeness — it is where the games holding an unlock come from, and it is
 * using the same six connections this load needs (see `request-waves`).
 *
 * A tab opened once stays opened for as long as that library lasts: a load
 * carries on while the reader is looking at something else, and coming back
 * shows what has landed rather than starting again. A new library disarms it
 * again — a reader who opened the tab for one player has not asked for the
 * next player's library to be fetched behind their back.
 *
 * One thing is asked of a caller: `library` must keep a stable identity across
 * renders — a fresh object each render restarts the load — and must be null
 * for as long as there is nothing counted to rank.
 */
export const useLibraryRarity = (
  library: CountedLibrary | null,
  active: boolean,
): LibraryRarity => {
  const [rarity, setRarity] = useState<RarityByAppId>(NO_RARITY);
  const [progress, setProgress] = useState<Progress>(NOTHING_ASKED);
  /**
   * The library the tab was opened for, and the whole of what starts a load.
   * Sticky in one direction only: leaving the tab does not disarm it, or a
   * load would be abandoned where the reader left it and never resumed.
   */
  const [armed, setArmed] = useState<CountedLibrary | null>(null);

  // Declared before the arming below, so that on the commit where a library is
  // replaced under a reader who is watching, this clears and that re-arms.
  useEffect(() => {
    // Another profile's rarity must never be crossed with this one's unlocks:
    // two libraries share appIds, so stale figures would not even look wrong.
    setRarity(NO_RARITY);
    setProgress(NOTHING_ASKED);
    setArmed(null);
  }, [library]);

  // Arming the tab is the reader's doing, and re-doing it for a library they
  // never asked about is not. Setting the same library twice changes nothing,
  // which is why leaving the tab and coming back fetches nothing again.
  useEffect(() => {
    if (active && library !== null) setArmed(library);
  }, [active, library]);

  useEffect(() => {
    let cancelled = false;

    if (armed !== null) {
      const wanted = gamesHoldingAnUnlock(armed.tallies);
      setProgress({ asked: wanted.length, answered: 0, done: false });

      void (async () => {
        await askInWaves(
          wanted,
          (appId) => armed.client.getGameRarity(appId),
          (landed, asked) => {
            if (cancelled) return;
            setRarity((known) => ({ ...known, ...landed }));
            // Counted for everything asked, not just what landed: a game that
            // failed is not coming, and the bar must not stop short of the end.
            setProgress((reached) => ({
              ...reached,
              answered: reached.answered + asked.length,
            }));
          },
          () => !cancelled,
        );

        if (!cancelled) setProgress((reached) => ({ ...reached, done: true }));
      })();
    }

    // Stops the waves where they are, and guards against one landing on a
    // library that is no longer the one being looked at.
    return () => {
      cancelled = true;
    };
  }, [armed]);

  const outstanding = progress.asked - progress.answered;

  return {
    rarity,
    status: statusOf(armed, active, library, progress.done),
    loaded: outstanding === 0 ? null : progress.answered / progress.asked,
  };
};
