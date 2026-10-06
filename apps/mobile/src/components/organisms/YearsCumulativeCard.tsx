import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { spacing } from "../../theme/tokens";
import type { YearsAndCumulative } from "../../view-models/years-and-cumulative";
import { ChartLegendKey } from "../atoms/ChartLegendKey";
import { RecordFigure } from "../molecules/RecordFigure";
import { StatCard } from "../molecules/StatCard";
import { YearBars } from "../molecules/YearBars";

export const YEARS_CARD_TEST_ID = "years-cumulative-card";

/** Height the chart's place is held at while no dated unlock has landed. */
const WAITING_CHART_HEIGHT = 164;

type Props = {
  readonly years: YearsAndCumulative;
  /** How far the library's tallies have got, or null when none are outstanding. */
  readonly loaded: number | null;
};

/** Card C of the stats page: each year's unlocks, the running total, and three records. */
export function YearsCumulativeCard({ years, loaded }: Props) {
  const { t } = useTranslation();
  const records = years.kind === "drawn" ? years.records : null;

  return (
    <View testID={YEARS_CARD_TEST_ID}>
      <StatCard
        eyebrow={t("stats.years.eyebrow")}
        figure={years.kind === "drawn" ? years.total : undefined}
        loaded={loaded}
        caption={years.kind === "drawn" ? years.span : undefined}
        subtitle={t("stats.years.subtitle")}
        empty={years.kind === "empty" ? t("stats.years.empty") : undefined}
        footer={
          <>
            <RecordFigure record={records?.bestMonth ?? null} />
            <RecordFigure record={records?.bestDay ?? null} />
            <RecordFigure record={records?.longestStreak ?? null} />
          </>
        }
      >
        {years.kind === "drawn" ? (
          <>
            <YearBars
              bars={years.bars}
              cumulative={years.cumulative}
              scale={years.scale}
              screenReaderLabel={years.screenReaderLabel}
            />
            <View style={styles.legend}>
              <ChartLegendKey label={t("stats.years.perYear")} swatch="bar" />
              <ChartLegendKey label={t("stats.years.thisYear")} swatch="outlined" />
              {years.cumulative !== null && (
                <ChartLegendKey label={t("stats.years.cumulative")} swatch="line" />
              )}
            </View>
          </>
        ) : (
          // Nothing dated has landed yet: the chart's place is held, and the
          // record skeletons below say the card is waiting.
          <View style={styles.waitingChart} />
        )}
      </StatCard>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: spacing.md },
  waitingChart: { height: WAITING_CHART_HEIGHT },
});
