import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { Locale } from "../i18n/locale";
import type { CountedUnlocks } from "./unlock-days";
import { buildUnlockWeek, type UnlockWeek } from "./unlock-week";
import { useHeldToneScale } from "./use-held-tone-scale";

/**
 * The player's typical week, rebuilt as the tallies land, its tone scale held
 * still for the load until the last of them has (see `useHeldToneScale`).
 * `view` and its `games` must keep their identity across renders, as for
 * `useYearsAndCumulative`.
 */
export const useUnlockWeek = (
  view: CountedUnlocks,
  counted: boolean,
  locale: Locale,
): UnlockWeek => {
  const { t } = useTranslation();
  const [heldScale, hold] = useHeldToneScale(view.games);
  const week = useMemo(
    () => buildUnlockWeek(view, counted, locale, t, heldScale),
    [view, counted, locale, t, heldScale],
  );

  hold(!counted && week.kind === "drawn" ? week.toneScale : null);
  return week;
};
