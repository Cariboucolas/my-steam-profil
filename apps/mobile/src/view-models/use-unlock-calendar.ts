import { useMemo, useRef } from "react";

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
 * while the reader was looking at it. What is held is remembered here and
 * handed back to the build, which is the same rule `useLibraryTallies` applies
 * to the list's order with `frozenOrder`: nothing moves under the reader's
 * eyes unless the reader asked for it.
 *
 * A scale is held for the load that read it and no longer, so the profile
 * after it is scaled against its own days rather than the previous player's.
 *
 * `view` must keep a stable identity across renders — a fresh object each
 * render rebuilds the whole year each render.
 */
export const useUnlockCalendar = (
  view: LibraryView,
  now: Date,
): UnlockCalendar => {
  const held = useRef<UnlockToneScale | null>(null);

  return useMemo(() => {
    const calendar = buildUnlockCalendar(view, now, held.current);
    // Written on the way out rather than in an effect: the next build is the
    // one that needs it, and it may be the very next render.
    held.current = calendar.counting ? calendar.scale : null;
    return calendar;
  }, [view, now]);
};
