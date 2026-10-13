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
/** Wider than a column: the total and the ticks overflow it, centred or from its left. */
const FIGURE_WIDTH = 40;
const TICK_WIDTH = 36;
/** Where the columns start: under the grid's, after its letters. */
const COLUMNS_LEFT = WEEK_GUTTER + WEEK_CELL_GAP;

type Props = { readonly hours: readonly HourBar[]; readonly scale: readonly ScaleLine[] };

/**
 * The 24 hours of the day, every day together, under the grid's columns. The
 * busiest hour is drawn in the full accent with its total over it; the others
 * at half strength, measured against the guide lines.
 */
export function HourBars({ hours, scale }: Props) {
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
              {hour.figure !== null && (
                <Text style={styles.figure} numberOfLines={1}>
                  {hour.figure}
                </Text>
              )}
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
      </View>
      <View style={styles.axis}>
        {hours.map((hour, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a day's hours never reorder: the index is the hour.
          <View key={index} style={styles.tickSlot}>
            {hour.tick !== null && (
              <Text style={styles.tick} numberOfLines={1}>
                {hour.tick}
              </Text>
            )}
          </View>
        ))}
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
  figure: {
    width: FIGURE_WIDTH,
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
  axis: { flexDirection: "row", gap: WEEK_CELL_GAP, paddingLeft: COLUMNS_LEFT, marginTop: 3 },
  tickSlot: { flex: 1, minWidth: 0 },
  tick: { width: TICK_WIDTH, fontFamily: fonts.mono, fontSize: 8.5, color: colors.textDim },
});
