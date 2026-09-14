import { render, within } from "@testing-library/react-native";

import { colors, unlockToneFills } from "../../theme/tokens";
import type { UnlockDay, UnlockMonth } from "../../view-models/unlock-calendar";
import { NARROWEST_SCREEN } from "../../theme/tokens";
import {
  CELL_GAP,
  dayCellWidth,
  UnlockMonthRow,
  UNLOCK_DAY_TEST_ID,
  UNLOCK_DAYS_TEST_ID,
  UNLOCK_MONTH_LABEL_TEST_ID,
  UNLOCK_MONTH_NAME_TEST_ID,
  UNLOCK_MONTH_TOTAL_TEST_ID,
} from "./UnlockMonthRow";

/**
 * What the row draws is painted for the eye and held out of the screen
 * reader's traversal on purpose, which is the behaviour pinned further down.
 * A query about paint has to say it wants what is hidden, or it finds nothing.
 */
const PAINTED = { includeHiddenElements: true } as const;

/** A day the builder has already scaled: what it held, and how dark it goes. */
const held = (count: number, tone: UnlockDay["tone"]): UnlockDay => ({
  count,
  tone,
});

/**
 * A row as the builder hands it over: thirty-one columns, of which the first
 * `drawnDays` are days that exist, holding what `days` says by day number.
 * Every other drawn day held nothing, and takes the empty tile.
 */
const month = (
  drawnDays: number,
  days: Readonly<Record<number, UnlockDay>> = {},
  current = false,
): UnlockMonth => {
  const total = Object.values(days).reduce((sum, day) => sum + day.count, 0);

  return {
    label: "APR",
    current,
    total,
    totalLabel: total === 0 ? "—" : String(total),
    screenReaderLabel: `April, ${total} unlocks`,
    days: Array.from({ length: 31 }, (_, index) =>
      index + 1 > drawnDays ? null : (days[index + 1] ?? held(0, 0)),
    ),
  };
};

describe("UnlockMonthRow", () => {
  it("draws only the days its month really holds", () => {
    const { getAllByTestId } = render(<UnlockMonthRow month={month(17)} />);

    expect(getAllByTestId(UNLOCK_DAY_TEST_ID, PAINTED)).toHaveLength(17);
  });

  it("leaves a day that held nothing on the empty tile", () => {
    const { getAllByTestId } = render(
      <UnlockMonthRow month={month(17, { 5: held(3, 2) })} />,
    );

    expect(
      getAllByTestId(UNLOCK_DAY_TEST_ID, PAINTED)[3]?.props.style
        .backgroundColor,
    ).toBe(colors.tileEmpty);
  });

  it("draws each tone in its own strength of the accent", () => {
    const { getAllByTestId } = render(
      <UnlockMonthRow
        month={month(17, {
          1: held(1, 1),
          2: held(3, 2),
          3: held(7, 3),
          4: held(20, 4),
        })}
      />,
    );
    const painted = getAllByTestId(UNLOCK_DAY_TEST_ID, PAINTED)
      .slice(0, 4)
      .map((day) => day.props.style.backgroundColor);

    expect(painted).toEqual(unlockToneFills.slice(1));
    // Four tones the reader can actually tell apart, rather than four names
    // for the same colour.
    expect(new Set(painted).size).toBe(4);
  });

  it("picks out the label of the month today falls in", () => {
    const { getByTestId } = render(
      <UnlockMonthRow month={month(17, {}, true)} />,
    );

    expect(
      getByTestId(UNLOCK_MONTH_NAME_TEST_ID, PAINTED).props.style.color,
    ).toBe(colors.accent);
  });

  it("leaves any other month's label quiet", () => {
    const { getByTestId } = render(<UnlockMonthRow month={month(30)} />);

    expect(
      getByTestId(UNLOCK_MONTH_NAME_TEST_ID, PAINTED).props.style.color,
    ).toBe(colors.textDim);
  });

  /**
   * The label column is sized to the longest label it promises to hold, and at
   * 9.5 pt it can take no growth at all before it wraps — a wrapped label
   * pushes its own row out of the grid. Both halves opt out of the system text
   * size rather than taking a cap that would round to 1 (ADR-0012). Nothing is
   * lost to a reader who cannot read it: the row is one screen-reader stop,
   * and it spells the month and its total out in full.
   */
  it("keeps both halves of the label out of the system text size", () => {
    const { getByTestId } = render(<UnlockMonthRow month={month(30)} />);

    for (const half of [
      UNLOCK_MONTH_NAME_TEST_ID,
      UNLOCK_MONTH_TOTAL_TEST_ID,
    ]) {
      expect(getByTestId(half, PAINTED).props.allowFontScaling).toBe(false);
    }
  });

  it("states the month's total beside its name", () => {
    const { getByTestId } = render(
      <UnlockMonthRow month={month(30, { 5: held(3, 1), 11: held(55, 4) })} />,
    );

    // One reading line: the name and the figure share the label's own box,
    // with no separate column at the end of the row to carry the total. They
    // are two texts rather than one because what separates them is a gap — a
    // space would be a glyph, and the column has no glyph to spare.
    const label = within(getByTestId(UNLOCK_MONTH_LABEL_TEST_ID, PAINTED));

    expect(label.getByText("APR", PAINTED)).toBeTruthy();
    expect(label.getByText("58", PAINTED)).toBeTruthy();
  });

  it("writes the month's total in the accent", () => {
    const { getByTestId } = render(
      <UnlockMonthRow month={month(30, { 5: held(3, 1) })} />,
    );

    expect(
      getByTestId(UNLOCK_MONTH_TOTAL_TEST_ID, PAINTED).props.style.color,
    ).toBe(colors.accent);
  });

  /**
   * The sentence arrives written: a row assembling its own would be a second
   * place for the wording to drift from the totals it is describing.
   */
  it("is a screen-reader stop, named for its month and its total", () => {
    const { getByLabelText } = render(
      <UnlockMonthRow month={month(30, { 5: held(3, 1), 11: held(55, 4) })} />,
    );

    expect(getByLabelText("April, 58 unlocks").props.accessible).toBe(true);
  });

  it("holds its own contents out of the traversal, on either platform", () => {
    // The stop above is only the whole of the row if nothing inside it is a
    // stop too. `accessible` is `focusable` on Android and does not settle
    // that on its own, so both platforms are told in their own words.
    const { getByTestId } = render(
      <UnlockMonthRow month={month(30, { 5: held(3, 1), 11: held(55, 4) })} />,
    );

    for (const inside of [UNLOCK_MONTH_LABEL_TEST_ID, UNLOCK_DAYS_TEST_ID]) {
      // Asked for by name, since being hidden is the very thing under test.
      const { props } = getByTestId(inside, PAINTED);

      expect(props.accessibilityElementsHidden).toBe(true);
      expect(props.importantForAccessibility).toBe("no-hide-descendants");
    }
  });

  it("writes what the builder gave it for a month that held nothing", () => {
    const { getByTestId } = render(<UnlockMonthRow month={month(30)} />);
    const label = within(getByTestId(UNLOCK_MONTH_LABEL_TEST_ID, PAINTED));

    expect(label.getByText("APR", PAINTED)).toBeTruthy();
    expect(label.getByText("—", PAINTED)).toBeTruthy();
  });
});

/**
 * Thirty-one columns have to fit a phone with no horizontal scroll, and a cell
 * stops being legible before it stops fitting. Where it stops was measured on
 * a phone, by an observer told which two cells to compare and asked which was
 * the paler, over every neighbouring pair of the ramp and every width down to
 * 3 px: **six** (ADR-0014).
 *
 * Six is not where the tones become indistinguishable — nothing in that run
 * was ever answered wrongly, down to 3 px. It is where telling them apart
 * stops costing the reader anything, which is the only threshold a calendar
 * read at a glance can be held to.
 *
 * It replaces the nine this file carried, which came from #29 and was the
 * narrowest of three sampled layouts rather than a floor anybody looked for.
 */
describe("dayCellWidth", () => {
  it("leaves a day the six pixels a reader needs, on the narrowest screen the app promises", () => {
    expect(dayCellWidth(NARROWEST_SCREEN)).toBeGreaterThanOrEqual(6);
  });

  /**
   * 360 is the portrait width of the Galaxy A and S ranges and one of the
   * three commonest viewports there are. The app does not promise it —
   * `NARROWEST_SCREEN` is 375, where the library card's headline stops
   * fitting — but the grid holds it, and saying so here is what keeps the next
   * widening of the label from taking it away in silence, the way ADR-0013's
   * label took it away once (#83).
   */
  it("holds the floor on the 360 px phones it serves without promising them", () => {
    expect(dayCellWidth(360)).toBeGreaterThanOrEqual(6);
  });

  /**
   * The floor alone no longer protects much: the grid clears it by more than
   * three pixels, so a label could widen a long way before any test noticed.
   * This freezes what the geometry actually yields, so that a change to the
   * label, the inset or the gutter has to be meant rather than merely allowed.
   */
  it("yields the width its own constants predict, and rejects a silent drift", () => {
    expect(dayCellWidth(NARROWEST_SCREEN)).toBeCloseTo(9.65, 2);
    expect(dayCellWidth(360)).toBeCloseTo(9.17, 2);
  });

  /**
   * What separates two days of the same tone. 0.25 px was still counted
   * correctly in the same run, so this is not the edge of legibility — it is
   * the edge of what has been looked at, and nothing thinner may ship without
   * looking again.
   */
  it("keeps the gutter no thinner than the measurement went", () => {
    expect(CELL_GAP).toBeGreaterThanOrEqual(0.5);
  });
});
