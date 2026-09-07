import type { GameDto } from "@steam/contracts";
import { useMemo, useState } from "react";

import type { LibraryView } from "./library";
import {
  buildUnlockCalendar,
  type UnlockCalendar,
  type UnlockToneScale,
} from "./unlock-calendar";

/**
 * The player's year, rebuilt as the tallies land, with its tone scale held
 * still until the last of them has.
 *
 * The scale is read off the days in hand, and the days in hand change with
 * every wave — so re-reading it on each build would repaint the whole grid
 * dozens of times over a cold open, and a day would change colour three times
 * while the reader was looking at it. What was read is remembered here and
 * handed back to the build, which is the same rule `useLibraryTallies` applies
 * to the list's order with `frozenOrder`: nothing moves under the reader's
 * eyes unless the reader asked for it.
 *
 * Nothing is held until a day of the player's own has arrived to read a scale
 * off — a cold library is counting before its first tally lands, and the
 * stand-in it draws against until then is nobody's scale.
 *
 * A scale is held for the load that read it and no longer. A load is its
 * games, which is the identity `useLibraryTallies` keys its own work on, so a
 * library arriving in a fresh array is a new load and reads its own scale.
 * Nothing else would say so: switching profile mid-count refills the
 * outstanding set in the same update that empties it, so `counting` never
 * falls to false between two loads.
 *
 * `view` must keep a stable identity across renders — a fresh object each
 * render rebuilds the whole year each render — and so must its `games`, which
 * is what names the load.
 */
/** A scale, and the load it was read for: a scale outlives neither. */
type HeldScale = {
  readonly games: readonly GameDto[];
  readonly scale: UnlockToneScale;
};

export const useUnlockCalendar = (
  view: LibraryView,
  now: Date,
): UnlockCalendar => {
  const [held, setHeld] = useState<HeldScale | null>(null);

  // Nothing is held for a library other than the one that read it.
  const heldScale =
    held !== null && held.games === view.games ? held.scale : null;
  const calendar = useMemo(
    () => buildUnlockCalendar(view, now, heldScale),
    [view, now, heldScale],
  );

  // Adjusted here rather than in an effect or a ref. A ref written mid-render
  // is one a render React abandons can still leave behind, and the scale a
  // load is held to must be one the reader was actually shown; an effect would
  // hand it over a commit later than the build that needs it. React re-runs
  // this component with the new value before committing anything, and the
  // build it re-runs then returns the very scale it was handed, so this
  // settles in one further pass and never loops.
  const worthHolding = calendar.counting ? calendar.scale : null;
  if (worthHolding !== heldScale) {
    setHeld(
      worthHolding === null ? null : { games: view.games, scale: worthHolding },
    );
  }

  return calendar;
};
