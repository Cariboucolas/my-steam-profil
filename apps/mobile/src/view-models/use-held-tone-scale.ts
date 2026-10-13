import type { GameDto } from "@steam/contracts";
import { useState } from "react";

import type { UnlockToneScale } from "./tone-scale";

/** A scale, and the load it was read for: a scale outlives neither. */
type HeldScale = {
  readonly games: readonly GameDto[];
  readonly scale: UnlockToneScale;
};

/**
 * A tone scale held still for the load that read it, so that nothing repaints
 * under the reader's eyes while the tallies land.
 *
 * The scale is read off what is in hand, and what is in hand changes with
 * every wave — so re-reading it on each build would repaint the whole chart
 * dozens of times over a cold open, and a cell would change colour three times
 * while the reader was looking at it. What was read is remembered here and
 * handed back to the build, which is the same rule `useLibraryTallies` applies
 * to the list's order with `frozenOrder`: nothing moves under the reader's
 * eyes unless the reader asked for it.
 *
 * Nothing is held until an unlock of the player's own has arrived to read a
 * scale off — a cold library is counting before its first tally lands, and the
 * stand-in it draws against until then is nobody's scale.
 *
 * A scale is held for the load that read it and no longer. A load is its
 * games, which is the identity `useLibraryTallies` keys its own work on, so a
 * library arriving in a fresh array is a new load and reads its own scale.
 * Nothing else would say so: switching profile mid-count refills the
 * outstanding set in the same update that empties it, so counting never stops
 * between two loads.
 *
 * Returns the scale held for `games`, or null, and `hold`, to be called in the
 * same render with the scale worth holding: the one the build was drawn
 * against while still counting, null once counted. The build must hand back
 * the very scale it was given, or `hold` would see a new one each render.
 */
export const useHeldToneScale = (
  games: readonly GameDto[],
): readonly [UnlockToneScale | null, (worthHolding: UnlockToneScale | null) => void] => {
  const [held, setHeld] = useState<HeldScale | null>(null);

  // Nothing is held for a library other than the one that read it.
  const heldScale = held !== null && held.games === games ? held.scale : null;

  // Adjusted during render rather than in an effect or a ref. A ref written
  // mid-render is one a render React abandons can still leave behind, and the
  // scale a load is held to must be one the reader was actually shown; an
  // effect would hand it over a commit later than the build that needs it.
  // React re-runs the component with the new value before committing anything,
  // and the build it re-runs then returns the very scale it was handed, so this
  // settles in one further pass and never loops.
  const hold = (worthHolding: UnlockToneScale | null): void => {
    if (worthHolding !== heldScale) {
      setHeld(worthHolding === null ? null : { games, scale: worthHolding });
    }
  };

  return [heldScale, hold];
};
