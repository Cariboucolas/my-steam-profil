import { StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { colors, fonts } from "../../theme/tokens";
import type { ScaleLine, YearBar } from "../../view-models/years-and-cumulative";

export const RUNNING_TOTAL_TEST_ID = "running-total";
export const SCALE_LINE_TEST_ID = "scale-line";

/** The tallest bar, in px; the running total spans the same height. */
const PLOT_HEIGHT = 140;
/** Room over the tallest bar for the figure written above it. */
const FIGURE_ROOM = 24;
/** A year with nothing keeps a sliver, so the gap reads as a year and not as a missing bar. */
const MIN_BAR = 2;
/** The line's own coordinate space, stretched over the plot. */
const VIEWBOX = 100;
const GAP = 5;
/**
 * What a label or a figure is given, whatever its bar is given. Seventeen years
 * on a phone leave a bar about 13 px, where `’10` wraps and `1 104` is cut
 * short. Wide enough for `12 345` in the mono face; it spills over the bars
 * beside it, which carry no label of their own past MAX_LABELLED_BARS.
 */
const SLOT_WIDTH = 44;
/** How far a guide line's amount sits above the line, so the line does not strike it. */
const SCALE_LABEL_LIFT = 2;

type Props = {
  readonly bars: readonly YearBar[];
  readonly cumulative: readonly number[] | null;
  /** Guide lines at round amounts, which scale the bars and not the running total. */
  readonly scale: readonly ScaleLine[];
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
export function YearBars({ bars, cumulative, scale, screenReaderLabel }: Props) {
  return (
    <View accessible accessibilityLabel={screenReaderLabel}>
      <View style={styles.plot}>
        {scale.map((line) => (
          <View
            key={line.label}
            testID={SCALE_LINE_TEST_ID}
            pointerEvents="none"
            style={[styles.scaleLine, { bottom: line.share * PLOT_HEIGHT }]}
          />
        ))}
        <View style={styles.columns}>
          {bars.map((bar) => (
            <View key={bar.year} style={styles.column}>
              {bar.figure !== null && (
                <Text style={[styles.slotText, styles.figure]} numberOfLines={1}>
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
        {scale.map((line) => (
          // Over the bars, so a tall first year does not hide its amount.
          <Text
            key={line.label}
            pointerEvents="none"
            style={[styles.scaleLabel, { bottom: line.share * PLOT_HEIGHT + SCALE_LABEL_LIFT }]}
          >
            {line.label}
          </Text>
        ))}
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
          <View key={bar.year} style={styles.labelSlot}>
            {bar.label !== null && (
              <Text
                style={[styles.slotText, styles.label, bar.current ? styles.currentLabel : null]}
                numberOfLines={1}
              >
                {bar.label}
              </Text>
            )}
          </View>
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
  scaleLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },
  scaleLabel: {
    position: "absolute",
    left: 0,
    fontFamily: fonts.mono,
    fontSize: 8.5,
    lineHeight: 10,
    color: colors.textDim,
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
  labelSlot: { flex: 1, minWidth: 0, alignItems: "center" },
  // maxWidth too: react-native-web caps a one-line text at 100% of its
  // parent, which is the narrow bar this text is meant to spill over.
  slotText: { width: SLOT_WIDTH, maxWidth: SLOT_WIDTH, textAlign: "center" },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    lineHeight: 12,
    color: colors.textMuted,
  },
  currentLabel: { color: colors.accent },
});
