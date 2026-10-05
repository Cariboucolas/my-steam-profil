import { StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { colors, fonts } from "../../theme/tokens";
import type { YearBar } from "../../view-models/years-and-cumulative";

export const RUNNING_TOTAL_TEST_ID = "running-total";

/** The tallest bar, in px; the running total spans the same height. */
const PLOT_HEIGHT = 140;
/** Room over the tallest bar for the figure written above it. */
const FIGURE_ROOM = 24;
/** A year with nothing keeps a sliver, so the gap reads as a year and not as a missing bar. */
const MIN_BAR = 2;
/** The line's own coordinate space, stretched over the plot. */
const VIEWBOX = 100;
const GAP = 5;

type Props = {
  readonly bars: readonly YearBar[];
  readonly cumulative: readonly number[] | null;
  /** The chart in one sentence: its bars are not stops of their own. */
  readonly screenReaderLabel: string;
};

/** Each year's share as a point of the line, centred over its bar. */
const pointsOf = (cumulative: readonly number[]): string =>
  cumulative
    .map((share, index) => {
      const x = ((index + 0.5) / cumulative.length) * VIEWBOX;
      const y = VIEWBOX - share * VIEWBOX;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

/** One bar per year, the running total over them, and the years under them. */
export function YearBars({ bars, cumulative, screenReaderLabel }: Props) {
  return (
    <View accessible accessibilityLabel={screenReaderLabel}>
      <View style={styles.plot}>
        <View style={styles.columns}>
          {bars.map((bar) => (
            <View key={bar.year} style={styles.column}>
              {bar.figure !== null && (
                <Text style={styles.figure} numberOfLines={1}>
                  {bar.figure}
                </Text>
              )}
              <View
                style={[
                  styles.bar,
                  bar.current ? styles.currentBar : null,
                  { height: Math.max(MIN_BAR, Math.round(bar.share * PLOT_HEIGHT)) },
                ]}
              />
            </View>
          ))}
        </View>
        {cumulative !== null && (
          <View style={styles.line} testID={RUNNING_TOTAL_TEST_ID} pointerEvents="none">
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
              preserveAspectRatio="none"
            >
              <Polyline
                points={pointsOf(cumulative)}
                fill="none"
                stroke={colors.runningTotal}
                strokeWidth={1.6}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </Svg>
          </View>
        )}
      </View>
      <View style={styles.axis}>
        {bars.map((bar) => (
          <Text key={bar.year} style={[styles.label, bar.current ? styles.currentLabel : null]}>
            {bar.label ?? ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { height: PLOT_HEIGHT + FIGURE_ROOM },
  columns: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: GAP,
  },
  column: { flex: 1, minWidth: 0, alignItems: "center", gap: 4 },
  figure: { fontFamily: fonts.mono, fontSize: 9.5, lineHeight: 12, color: colors.text },
  bar: {
    alignSelf: "stretch",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: colors.accent,
  },
  currentBar: {
    backgroundColor: colors.accentBorder,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.accent,
  },
  line: { position: "absolute", left: 0, right: 0, bottom: 0, height: PLOT_HEIGHT },
  axis: {
    flexDirection: "row",
    gap: GAP,
    marginTop: GAP,
    paddingTop: GAP,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  label: {
    flex: 1,
    minWidth: 0,
    textAlign: "center",
    fontFamily: fonts.mono,
    fontSize: 9.5,
    lineHeight: 12,
    color: colors.textMuted,
  },
  currentLabel: { color: colors.accent },
});
