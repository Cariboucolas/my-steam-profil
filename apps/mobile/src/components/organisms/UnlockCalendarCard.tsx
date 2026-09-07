import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import { useUnlockCalendarScroll } from "../../view-models/use-unlock-calendar-scroll";
import { UnlockCalendarHeader } from "../molecules/UnlockCalendarHeader";
import { UnlockHalfDots } from "../molecules/UnlockHalfDots";
import { UnlockMonthRow } from "../molecules/UnlockMonthRow";
import { UnlockToneLegend } from "../molecules/UnlockToneLegend";

export const UNLOCK_CALENDAR_CARD_TEST_ID = "unlock-calendar-card";
export const UNLOCK_CALENDAR_GRID_TEST_ID = "unlock-calendar-grid";
export const UNLOCK_FADE_TOP_TEST_ID = "unlock-calendar-fade-top";
export const UNLOCK_FADE_BOTTOM_TEST_ID = "unlock-calendar-fade-bottom";

/** What the grid leaves between two month rows, and so between six of them. */
const ROW_GAP = spacing.xs;

/** How deep an edge fades: about a row and a half of grid. */
const FADE_DEPTH = 18;

type Props = { readonly calendar: UnlockCalendar };

/**
 * The player's year, one row per month begun, running the full width of the
 * screen: thirty-one day columns have to fit a phone, and an inset card puts
 * the cell at 7.8px, under what four tones need to be told apart.
 *
 * The card grows a row a month up to six and then holds that height and
 * scrolls, so a full December fits without taking over the screen. Nothing is
 * reserved for the months still to come: a January card is one row tall, and
 * its size is itself honest information about how much year there is.
 *
 * What says there is more year is the edge itself — the fade — and the two
 * dots below, which are a control rather than a mark: pressing one moves the
 * grid. The scroll is free and never paged, because paging behaves worst in
 * July, where the second half of the year holds a single row.
 *
 * Over the grid, the header says where the player stands: the year's running
 * total, and the whole of the year before it is measured against. Under the
 * grid, the legend states the numbers behind the tones, because the window
 * they are read over is not the year the grid draws (ADR-0007).
 *
 * It draws no surface and no border of its own. A band of its own tone read as
 * a seam across the screen and pulled the eye harder than the grid it was
 * holding, so the grid sits straight on the screen's own ground and the months
 * are the only thing to look at.
 */
export function UnlockCalendarCard({ calendar }: Props) {
  const scroll = useUnlockCalendarScroll(calendar.months.length, ROW_GAP);

  const months = calendar.months.map((month) => (
    <UnlockMonthRow key={month.label} month={month} />
  ));

  // A year the card holds whole is drawn as it always was: no scroll to be
  // had, and so nothing anywhere that speaks of one.
  const grid = scroll.scrolls ? (
    <View>
      <ScrollView
        testID={UNLOCK_CALENDAR_GRID_TEST_ID}
        ref={scroll.ref}
        // Held to six rows only once the grid has said how tall it turned
        // out; until then it draws at its own height, which is what it is
        // measured at.
        style={{ maxHeight: scroll.height }}
        contentContainerStyle={styles.grid}
        onContentSizeChange={scroll.onContentSizeChange}
        onScroll={scroll.onScroll}
        // Often enough that the dot answers to the drag rather than to where
        // it came to rest.
        scrollEventThrottle={16}
        // The fade and the dots are what say there is more year. A native bar
        // would be a third thing saying it, and on the platform where it can
        // be grabbed it is the one that says it least clearly.
        showsVerticalScrollIndicator={false}
        // The library list this sits in scrolls the same way. Android gives
        // the inner grid nothing without the first of these; the second keeps
        // the grid from rubber-banding away from an edge the card is meant to
        // be holding, and leaves the list the drag that reached that edge.
        nestedScrollEnabled
        bounces={false}
      >
        {months}
      </ScrollView>

      {scroll.fades.top ? (
        <LinearGradient
          testID={UNLOCK_FADE_TOP_TEST_ID}
          pointerEvents="none"
          colors={[colors.bg, colors.bgClear]}
          style={styles.fadeTop}
        />
      ) : null}

      {scroll.fades.bottom ? (
        <LinearGradient
          testID={UNLOCK_FADE_BOTTOM_TEST_ID}
          pointerEvents="none"
          colors={[colors.bgClear, colors.bg]}
          style={styles.fadeBottom}
        />
      ) : null}
    </View>
  ) : (
    <View style={styles.grid}>{months}</View>
  );

  return (
    <View testID={UNLOCK_CALENDAR_CARD_TEST_ID} style={styles.card}>
      <UnlockCalendarHeader
        total={calendar.total}
        frameLabel={calendar.frameLabel}
        deltaLabel={calendar.deltaLabel}
      />

      {grid}

      {scroll.scrolls ? (
        <UnlockHalfDots inView={scroll.half} onSelect={scroll.goToHalf} />
      ) : null}

      <UnlockToneLegend legend={calendar.legend} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xxl,
    paddingVertical: spacing.lg + 2,
  },
  grid: {
    gap: ROW_GAP,
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: FADE_DEPTH,
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FADE_DEPTH,
  },
});
