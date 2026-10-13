import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { spacing } from "../../theme/tokens";
import type { UnlockWeek } from "../../view-models/unlock-week";
import { HourBars } from "../molecules/HourBars";
import { RecordFigure } from "../molecules/RecordFigure";
import { StatCard } from "../molecules/StatCard";
import { UnlockWeekGrid } from "../molecules/UnlockWeekGrid";

export const WEEK_CARD_TEST_ID = "unlock-week-card";

/** Height the chart's place is held at while no dated unlock has landed: grid, legend and bars. */
const WAITING_CHART_HEIGHT = 230;

type Props = {
  readonly week: UnlockWeek;
  /** How far the library's tallies have got, or null when none are outstanding. */
  readonly loaded: number | null;
};

/** Card B of the stats page: the player's typical week, its busiest slot, and three shares. */
export function UnlockWeekCard({ week, loaded }: Props) {
  const { t } = useTranslation();
  const drawn = week.kind === "drawn" ? week : null;
  const busiestSlot = drawn?.busiestSlot ?? undefined;
  const shares = drawn?.shares ?? null;

  return (
    <View testID={WEEK_CARD_TEST_ID}>
      <StatCard
        eyebrow={t("stats.week.eyebrow")}
        figure={busiestSlot}
        loaded={loaded}
        caption={busiestSlot === undefined ? undefined : t("stats.week.busiestSlot")}
        subtitle={t("stats.week.subtitle")}
        empty={week.kind === "empty" ? t("stats.week.empty") : undefined}
        footer={
          <>
            <RecordFigure record={shares?.[0] ?? null} />
            <RecordFigure record={shares?.[1] ?? null} />
            <RecordFigure record={shares?.[2] ?? null} />
          </>
        }
      >
        {drawn !== null ? (
          // One stop for the whole picture: 168 squares and 24 bars read aloud
          // one by one would say less than the sentence does.
          <View accessible accessibilityLabel={drawn.screenReaderLabel} style={styles.chart}>
            <UnlockWeekGrid rows={drawn.rows} legend={drawn.legend} />
            <HourBars hours={drawn.hours} scale={drawn.scale} />
          </View>
        ) : (
          <View style={styles.waitingChart} />
        )}
      </StatCard>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: spacing.sm },
  waitingChart: { height: WAITING_CHART_HEIGHT },
});
