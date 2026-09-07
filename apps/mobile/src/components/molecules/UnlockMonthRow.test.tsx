import { render } from "@testing-library/react-native";

import { colors, unlockToneFills } from "../../theme/tokens";
import type {
  UnlockDay,
  UnlockMonth,
} from "../../view-models/unlock-calendar";
import {
  dayCellWidth,
  UnlockMonthRow,
  UNLOCK_DAY_TEST_ID,
  UNLOCK_DAYS_TEST_ID,
  UNLOCK_MONTH_LABEL_TEST_ID,
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
      getAllByTestId(UNLOCK_DAY_TEST_ID, PAINTED)[3]?.props.style.backgroundColor,
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

    expect(getByTestId(UNLOCK_MONTH_LABEL_TEST_ID, PAINTED).props.style.color).toBe(
      colors.accent,
    );
  });

  it("leaves any other month's label quiet", () => {
    const { getByTestId } = render(<UnlockMonthRow month={month(30)} />);

    expect(getByTestId(UNLOCK_MONTH_LABEL_TEST_ID, PAINTED).props.style.color).toBe(
      colors.textDim,
    );
  });

  it("states the month's total beside its name", () => {
    const { getByText } = render(
      <UnlockMonthRow month={month(30, { 5: held(3, 1), 11: held(55, 4) })} />,
    );

    // One reading line: the name and the figure, with no separate column at
    // the end of the row to carry the total.
    expect(getByText("APR 58", PAINTED)).toBeTruthy();
  });

  it("writes the month's total in the accent", () => {
    const { getByTestId } = render(
      <UnlockMonthRow month={month(30, { 5: held(3, 1) })} />,
    );

    expect(getByTestId(UNLOCK_MONTH_TOTAL_TEST_ID, PAINTED).props.style.color).toBe(
      colors.accent,
    );
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
    const { getByText } = render(<UnlockMonthRow month={month(30)} />);

    expect(getByText("APR —", PAINTED)).toBeTruthy();
  });
});

/**
 * Thirty-one columns have to fit a phone with no horizontal scroll, and a cell
 * stops being legible before it stops fitting. The prototype measured it:
 * four tones cannot be told apart at 6-7px, and 9px is the smallest that reads
 * (`prototype/activity-grid-width`, verdict on #29). These are the widths the
 * label and the gutter are allowed to leave behind.
 */
describe("dayCellWidth", () => {
  it("leaves a day at least nine pixels on a 375 px phone", () => {
    expect(dayCellWidth(375)).toBeGreaterThanOrEqual(9);
  });

  it("leaves a day at least ten pixels on a 402 px phone", () => {
    expect(dayCellWidth(402)).toBeGreaterThanOrEqual(10);
  });
});
