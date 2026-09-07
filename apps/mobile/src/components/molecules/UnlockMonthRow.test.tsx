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
  UNLOCK_MONTH_LABEL_TEST_ID,
  UNLOCK_MONTH_TOTAL_TEST_ID,
} from "./UnlockMonthRow";

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
    days: Array.from({ length: 31 }, (_, index) =>
      index + 1 > drawnDays ? null : (days[index + 1] ?? held(0, 0)),
    ),
  };
};

describe("UnlockMonthRow", () => {
  it("draws only the days its month really holds", () => {
    const { getAllByTestId } = render(<UnlockMonthRow month={month(17)} />);

    expect(getAllByTestId(UNLOCK_DAY_TEST_ID)).toHaveLength(17);
  });

  it("leaves a day that held nothing on the empty tile", () => {
    const { getAllByTestId } = render(
      <UnlockMonthRow month={month(17, { 5: held(3, 2) })} />,
    );

    expect(
      getAllByTestId(UNLOCK_DAY_TEST_ID)[3]?.props.style.backgroundColor,
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
    const painted = getAllByTestId(UNLOCK_DAY_TEST_ID)
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

    expect(getByTestId(UNLOCK_MONTH_LABEL_TEST_ID).props.style.color).toBe(
      colors.accent,
    );
  });

  it("leaves any other month's label quiet", () => {
    const { getByTestId } = render(<UnlockMonthRow month={month(30)} />);

    expect(getByTestId(UNLOCK_MONTH_LABEL_TEST_ID).props.style.color).toBe(
      colors.textDim,
    );
  });

  it("states the month's total beside its name", () => {
    const { getByText } = render(
      <UnlockMonthRow month={month(30, { 5: held(3, 1), 11: held(55, 4) })} />,
    );

    // One reading line: the name and the figure, with no separate column at
    // the end of the row to carry the total.
    expect(getByText("APR 58")).toBeTruthy();
  });

  it("writes the month's total in the accent", () => {
    const { getByTestId } = render(
      <UnlockMonthRow month={month(30, { 5: held(3, 1) })} />,
    );

    expect(getByTestId(UNLOCK_MONTH_TOTAL_TEST_ID).props.style.color).toBe(
      colors.accent,
    );
  });

  it("writes what the builder gave it for a month that held nothing", () => {
    const { getByText } = render(<UnlockMonthRow month={month(30)} />);

    expect(getByText("APR —")).toBeTruthy();
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
