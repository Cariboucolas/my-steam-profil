import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { CountedUnlocks } from "./unlock-days";
import { buildYearsAndCumulative, type YearsAndCumulative } from "./years-and-cumulative";

/**
 * The years card, rebuilt as the tallies land. `view` must keep a stable
 * identity across renders, or the whole history is recounted each render.
 */
export const useYearsAndCumulative = (
  view: CountedUnlocks,
  counted: boolean,
  now: Date,
): YearsAndCumulative => {
  const { t } = useTranslation();
  return useMemo(() => buildYearsAndCumulative(view, counted, now, t), [view, counted, now, t]);
};
