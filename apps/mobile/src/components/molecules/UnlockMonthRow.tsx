import { StyleSheet, Text, View } from "react-native";

import {
  colors,
  fonts,
  MONO_ADVANCE,
  spacing,
  unlockToneFills,
} from "../../theme/tokens";
import {
  COLUMNS,
  type UnlockDay,
  type UnlockMonth,
} from "../../view-models/unlock-calendar";

export const UNLOCK_DAY_TEST_ID = "unlock-day";
export const UNLOCK_DAYS_TEST_ID = "unlock-days";
export const UNLOCK_MONTH_LABEL_TEST_ID = "unlock-month-label";
export const UNLOCK_MONTH_NAME_TEST_ID = "unlock-month-name";
export const UNLOCK_MONTH_TOTAL_TEST_ID = "unlock-month-total";

/** The size the label is painted at, and the width model reads. */
const LABEL_FONT_SIZE = 9.5;

/** `DEC` — every month writes its abbreviation in three characters. */
const MONTH_CHARS = 3;
/**
 * What holds the total off the month's name. It is a gap rather than a space,
 * and that is where this column found the room for a fourth digit: a space is
 * a glyph, and in a monospaced face a glyph costs as much as a digit. Two
 * pixels read as the same separation for a third of the price (ADR-0013).
 *
 * Not a spacing token: the scale is for laying out boxes, and a token free to
 * move for reasons of its own has no business in a formula this column has two
 * pixels of room left in.
 */
const SEPARATOR_GAP = 2;
/**
 * The longest total the column promises to write out in full. Four digits is
 * 9 999 unlocks in a single month, which is three hundred and thirty-three a
 * day held for thirty days: the point past which the figure stops being one a
 * player could produce. The figure is never shortened and never truncated, so
 * this is the one constant that says how far that promise reaches.
 */
const TOTAL_GUARANTEED_CHARS = 4;

/**
 * How wide this many characters are drawn, read from the very size the label
 * is painted at, so raising it raises what the column asks for. There is no
 * letter-spacing term because the label carries no letter spacing: at 9.5 pt
 * it is what a fourth digit was spent on, and adding any back is a widening
 * this column has to ask the grid to pay for.
 */
const labelTextWidth = (chars: number): number =>
  chars * LABEL_FONT_SIZE * MONO_ADVANCE;

/**
 * What the column keeps over what the model predicts. Half a glyph, because
 * that is what it protects against: the model gives the width of the text and
 * the platform rounds it to whole pixels, and a single pixel over is a label
 * that wraps. Derived rather than chosen, so enlarging the type widens the
 * margin with it.
 */
const LABEL_SLACK = 0.5 * LABEL_FONT_SIZE * MONO_ADVANCE;

/**
 * The label column, so every row's days start on the same vertical line.
 *
 * What it promises is exact: four digits written out, never shortened and
 * never truncated, bought from this label's own typography rather than from
 * the day cells (ADR-0013).
 *
 * It is derived rather than written: the width is whatever the longest label
 * the column promises to hold demands. Raise the type, widen the spacing or
 * lengthen the guarantee and the column widens on its own — and it is then the
 * day cells that run out of room, which is where `dayCellWidth` below and the
 * floors that pin it say so.
 *
 * It takes no growth at all from the reader's text size: the separator is a
 * gap and does not scale, so a multiplier of any size the reader could pick
 * wraps the label and pushes its own row out of the grid. The label opts out
 * rather than taking a cap that would round to 1 (ADR-0012).
 */
const LABEL_WIDTH =
  labelTextWidth(MONTH_CHARS) +
  SEPARATOR_GAP +
  labelTextWidth(TOTAL_GUARANTEED_CHARS) +
  LABEL_SLACK;
const CELL_RADIUS = 1;
/**
 * What sits between two days. Half a pixel rather than one, which is where the
 * grid found the room to hold 360 dp: thirty gutters give fifteen pixels back,
 * and a day cell at 360 becomes 9.17 px — the very width 375 had before this.
 * Nothing was extrapolated to get there; 360 inherits a width the prototype's
 * floor was already met at (#83).
 *
 * Every width gets the same half pixel back, so this is not a concession made
 * to the narrow phone. What it costs is a gutter that does not land on a whole
 * pixel at every density, and that is the trade to weigh before restoring it
 * to 1 — which would take 360 back under the floor #29 measured.
 */
const CELL_GAP = 0.5;

/**
 * All the row holds the grid off the screen edge by. The band it sits in
 * spends nothing on a margin, because thirty-one columns leave no width to
 * spend: every pixel taken here comes out of the day cells. The legend under
 * the grid reads it, so that it ends on the same line the rows do.
 */
export const GRID_INSET = spacing.sm;

/**
 * How wide a day ends up on a phone this many pixels across. The cells
 * themselves flex, so this predicts rather than sets — but it predicts from
 * the very constants above, so a wider label or a fatter gutter fails the
 * tests that pin the legible minimum.
 */
export const dayCellWidth = (screenWidth: number): number =>
  (screenWidth - 2 * GRID_INSET - LABEL_WIDTH - (COLUMNS - 1) * CELL_GAP) /
  COLUMNS;

/**
 * What a column is painted: nothing where no day sits behind it, and otherwise
 * the fill its tone names. The row reads the tone off the day it was handed; it
 * never works one out from a count.
 */
const fillFor = (day: UnlockDay | null): string =>
  day === null ? "transparent" : unlockToneFills[day.tone];

/**
 * What keeps a row's own contents out of the traversal, so that the label the
 * row carries is the whole of what is read there.
 *
 * `accessible` alone does not do it. It means `isAccessibilityElement` on iOS
 * but only `focusable` on Android, where TalkBack stays free to stop on a
 * descendant — which would make a row two stops and its days thirty-one.
 * The two platforms have their own word for the same thing, so both are said.
 */
const CONTENTS_NOT_READ = {
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
} as const;

type Props = { readonly month: UnlockMonth };

/**
 * One month of the unlock calendar: its label, then its days.
 *
 * Every row draws thirty-one columns whatever its month holds, so that a day
 * sits under the same day in every month. A column with no day behind it — the
 * 31st of April, a day not yet lived through — keeps its place and draws
 * nothing. The row decides none of this; it is handed the shape it draws.
 *
 * The month's total sits inside its label rather than in a column of its own at
 * the end of the row. That column would cost the grid the width the cells need
 * to be told apart, and the total reads just as well on the name it belongs to.
 *
 * Read aloud it is one stop, carrying the sentence the builder wrote for it —
 * and its thirty-one cells are no stops at all, for the reason the field's own
 * documentation gives.
 */
export function UnlockMonthRow({ month }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={month.screenReaderLabel}
      style={styles.row}
    >
      <View
        {...CONTENTS_NOT_READ}
        testID={UNLOCK_MONTH_LABEL_TEST_ID}
        style={styles.label}
      >
        <Text
          allowFontScaling={false}
          testID={UNLOCK_MONTH_NAME_TEST_ID}
          style={{
            ...styles.name,
            color: month.current ? colors.accent : colors.textDim,
          }}
        >
          {month.label}
        </Text>
        <Text
          allowFontScaling={false}
          testID={UNLOCK_MONTH_TOTAL_TEST_ID}
          style={styles.total}
        >
          {month.totalLabel}
        </Text>
      </View>

      <View
        {...CONTENTS_NOT_READ}
        testID={UNLOCK_DAYS_TEST_ID}
        style={styles.days}
      >
        {month.days.map((day, index) => (
          <View
            key={index}
            testID={day === null ? undefined : UNLOCK_DAY_TEST_ID}
            style={{
              ...styles.cell,
              backgroundColor: fillFor(day),
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: GRID_INSET,
  },
  label: {
    width: LABEL_WIDTH,
    flexDirection: "row",
    // The month and its figure sit on one line, so they sit on one baseline:
    // centring two boxes works only while both are painted at the same size.
    alignItems: "baseline",
    gap: SEPARATOR_GAP,
  },
  name: {
    fontFamily: fonts.monoMedium,
    fontSize: LABEL_FONT_SIZE,
  },
  total: {
    fontFamily: fonts.monoMedium,
    fontSize: LABEL_FONT_SIZE,
    color: colors.accent,
  },
  days: {
    flex: 1,
    flexDirection: "row",
    gap: CELL_GAP,
  },
  cell: {
    flex: 1,
    // Square, whatever width thirty-one columns leave it on this phone.
    aspectRatio: 1,
    borderRadius: CELL_RADIUS,
  },
});
