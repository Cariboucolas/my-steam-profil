import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, unlockToneFills } from "../../theme/tokens";
import type { HourBar } from "../../view-models/unlock-week";
import type { ScaleLine } from "../../view-models/years-and-cumulative";
import { WEEK_CELL_GAP, WEEK_GUTTER } from "./UnlockWeekGrid";

export const HOUR_BAR_TEST_ID = "hour-bar";

const PLOT_HEIGHT = 64;
/** Room over the tallest bar for its total. */
const FIGURE_ROOM = 14;
/** An hour holding nothing still shows where it is. */
const MIN_BAR = 1;
/**
 * Wider than a column, which is about ten pixels on a phone: the total and the
 * ticks are placed over the plot rather than inside a column, or they would be
 * cut to its width.
 */
const FIGURE_WIDTH = 40;
const TICK_WIDTH = 36;
const TICK_LINE = 11;
/** Space between the total and the top of its bar. */
const FIGURE_LIFT = 2;
/** Where the columns start: under the grid's, after its letters. */
const COLUMNS_LEFT = WEEK_GUTTER + WEEK_CELL_GAP;

type Props = { readonly hours: readonly HourBar[]; readonly scale: readonly ScaleLine[] };

/**
 * The 24 hours of the day, every day together, under the grid's columns. The
 * busiest hour is drawn in the full accent with its total over it; the others
 * at half strength, measured against the guide lines.
 */
export function HourBars({ hours, scale }: Props) {
  // Where an hour starts across the plot, as a share of its width; the gaps
  // between columns shift this by under two pixels, which the eye cannot see.
  const startOf = (hour: number) => `${(hour / hours.length) * 100}%` as const;
  const middleOf = (hour: number) => `${((hour + 0.5) / hours.length) * 100}%` as const;

  return (
    <View>
      <View style={styles.plot}>
        {scale.map((line) => (
          <Fragment key={line.label}>
            <View style={[styles.scaleLine, { bottom: line.share * PLOT_HEIGHT }]} />
            <Text style={[styles.scaleLabel, { bottom: line.share * PLOT_HEIGHT + 1 }]}>
              {line.label}
            </Text>
          </Fragment>
        ))}
        <View style={styles.columns}>
          {hours.map((hour, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a day's hours never reorder: the index is the hour.
            <View key={index} style={styles.column}>
              <View
                testID={HOUR_BAR_TEST_ID}
                style={[
                  styles.bar,
                  hour.busiest ? styles.busiestBar : null,
                  { height: Math.max(MIN_BAR, hour.share * PLOT_HEIGHT) },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.overColumns}>
          {hours.map((hour, index) =>
            hour.figure === null ? null : (
              <Text
                // biome-ignore lint/suspicious/noArrayIndexKey: a day's hours never reorder: the index is the hour.
                key={index}
                style={[
                  styles.figure,
                  { left: middleOf(index), bottom: hour.share * PLOT_HEIGHT + FIGURE_LIFT },
                ]}
                numberOfLines={1}
              >
                {hour.figure}
              </Text>
            ),
          )}
        </View>
      </View>
      <View style={styles.axis}>
        {hours.map((hour, index) =>
          hour.tick === null ? null : (
            <Text
              // biome-ignore lint/suspicious/noArrayIndexKey: a day's hours never reorder: the index is the hour.
              key={index}
              style={[styles.tick, { left: startOf(index) }]}
              numberOfLines={1}
            >
              {hour.tick}
            </Text>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { height: PLOT_HEIGHT + FIGURE_ROOM, marginTop: 10 },
  columns: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: COLUMNS_LEFT,
    flexDirection: "row",
    gap: WEEK_CELL_GAP,
  },
  column: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "flex-end", gap: 2 },
  overColumns: {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: COLUMNS_LEFT,
  },
  figure: {
    position: "absolute",
    width: FIGURE_WIDTH,
    marginLeft: -FIGURE_WIDTH / 2,
    textAlign: "center",
    fontFamily: fonts.mono,
    fontSize: 9.5,
    lineHeight: 12,
    color: colors.accent,
  },
  bar: {
    alignSelf: "stretch",
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
    backgroundColor: unlockToneFills[2],
  },
  busiestBar: { backgroundColor: colors.accent },
  scaleLine: {
    pointerEvents: "none",
    position: "absolute",
    left: COLUMNS_LEFT,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },
  scaleLabel: {
    pointerEvents: "none",
    position: "absolute",
    left: 0,
    fontFamily: fonts.mono,
    fontSize: 8.5,
    lineHeight: 10,
    color: colors.textDim,
  },
  axis: { height: TICK_LINE, marginLeft: COLUMNS_LEFT, marginTop: 3 },
  tick: {
    position: "absolute",
    top: 0,
    width: TICK_WIDTH,
    fontFamily: fonts.mono,
    fontSize: 8.5,
    lineHeight: TICK_LINE,
    color: colors.textDim,
  },
});
