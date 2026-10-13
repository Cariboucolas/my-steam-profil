import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { LibraryView } from "./library";
import { buildUnlockCalendar, type UnlockCalendar } from "./unlock-calendar";
import { useHeldToneScale } from "./use-held-tone-scale";

/**
 * The player's year, rebuilt as the tallies land, with its tone scale held
 * still until the last of them has (see `useHeldToneScale`).
 *
 * `view` must keep a stable identity across renders — a fresh object each
 * render rebuilds the whole year each render — and so must its `games`, which
 * is what names the load.
 */
export const useUnlockCalendar = (view: LibraryView, now: Date): UnlockCalendar => {
  const { t } = useTranslation();
  const [heldScale, hold] = useHeldToneScale(view.games);
  const calendar = useMemo(
    () => buildUnlockCalendar(view, now, t, heldScale),
    [view, now, t, heldScale],
  );

  hold(calendar.counting ? calendar.scale : null);
  return calendar;
};
