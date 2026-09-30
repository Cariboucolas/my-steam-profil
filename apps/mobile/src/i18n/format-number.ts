import type { Translate } from "./i18n";

const GROUP_OF = /\B(?=(\d{3})+(?!\d))/g;
const GROUP_SEPARATOR = " ";

/**
 * A number written in the locale `t` is bound to, with thousands grouped by a
 * plain U+0020 (ADR-0011): the decimal mark follows the locale, so `45.5` and
 * `45,5`, and the grouping is the design's in both.
 *
 * `t` is asked for the digits only, ungrouped. Locales disagree on what the
 * group separator is (a comma, a narrow no-break space) and the width model
 * measures U+0020, so the grouping is done here, once, on the integer part.
 */
export const formatNumber = (
  t: Translate,
  value: number,
  maximumFractionDigits = 0,
): string => {
  const written = t("format.number", {
    value,
    formatParams: { value: { useGrouping: false, maximumFractionDigits } },
  });
  return written.replace(/^-?\d+/, (integer) => integer.replace(GROUP_OF, GROUP_SEPARATOR));
};
