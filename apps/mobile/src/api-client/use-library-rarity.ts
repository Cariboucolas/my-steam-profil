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
  readonly landed: number;
  /**
   * Every answer that is coming has come. Not the same as nothing outstanding:
   * a load that has not started has nothing outstanding either.
   */
  readonly done: boolean;
};

const NOTHING_ASKED: Progress = { asked: 0, landed: 0, done: false };

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
const statusOf = (
  opened: boolean,
  library: CountedLibrary | null,
  done: boolean,
): RarityStatus => {
  if (!opened) return "idle";
  if (library === null) return "counting";
  return done ? "ready" : "loading";
};

const gamesHoldingAnUnlock = (tallies: TallyByAppId): readonly number[] =>
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
 * Once opened, the tab stays opened: a load carries on while the reader is
 * looking at something else, and coming back shows what has landed rather than
 * starting again. The answer belongs to the session, and only a new library
 * throws it away.
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
   * Sticky: what starts a load is the tab having been opened, never its being
   * open now. Were the load to hang on `active`, leaving the tab mid-load
   * would abandon it where it stood and coming back would not resume it.
   */
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (active) setOpened(true);
  }, [active]);

  useEffect(() => {
    let cancelled = false;

    // Another profile's rarity must never be crossed with this one's unlocks,
    // and a library still being counted has nothing to show yet.
    setRarity(NO_RARITY);
    setProgress(NOTHING_ASKED);

    if (library !== null && opened) {
      const wanted = gamesHoldingAnUnlock(library.tallies);
      setProgress({ asked: wanted.length, landed: 0, done: false });

      void (async () => {
        await askInWaves(
          wanted,
          (appId) => library.client.getGameRarity(appId),
          (landed, asked) => {
            if (cancelled) return;
            setRarity((known) => ({ ...known, ...landed }));
            // Counted for everything asked, not just what landed: a game that
            // failed is not coming, and the bar must not stop short of the end.
            setProgress((far) => ({ ...far, landed: far.landed + asked.length }));
          },
          () => !cancelled,
        );

        if (!cancelled) setProgress((far) => ({ ...far, done: true }));
      })();
    }

    // Stops the waves where they are, and guards against one landing on a
    // library that is no longer the one being looked at.
    return () => {
      cancelled = true;
    };
  }, [library, opened]);

  const outstanding = progress.asked - progress.landed;

  return {
    rarity,
    status: statusOf(opened, library, progress.done),
    loaded: outstanding === 0 ? null : progress.landed / progress.asked,
  };
};
