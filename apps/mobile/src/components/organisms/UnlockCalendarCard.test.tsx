import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { UNLOCK_DAY_TEST_ID } from "../molecules/UnlockMonthRow";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import {
  UnlockCalendarCard,
  UNLOCK_CALENDAR_CARD_TEST_ID,
} from "./UnlockCalendarCard";

/** A year that has reached the 5th of March, scaled as ADR-0007 has it. */
const calendar: UnlockCalendar = {
  months: ["JAN", "FEB", "MAR"].map((label, index) => ({
    label,
    current: label === "MAR",
    total: 0,
    totalLabel: "—",
    days: Array.from({ length: 31 }, (_, day) =>
      day + 1 > [31, 28, 5][index]! ? null : { count: 0, tone: 0 },
    ),
  })),
  legend: [
    { tone: 0, label: "0" },
    { tone: 1, label: "1-2" },
    { tone: 2, label: "3-5" },
    { tone: 3, label: "6-11" },
    { tone: 4, label: "12+" },
  ],
  counting: false,
  scale: [2, 5, 11],
};

describe("UnlockCalendarCard", () => {
  it("draws a row for every month the year has reached", () => {
    const { getByText, queryByText } = render(
      <UnlockCalendarCard calendar={calendar} />,
    );

    // A label carries its month's total, so it reads "JAN —" for a month
    // that held nothing.
    expect(getByText("JAN —")).toBeTruthy();
    expect(getByText("MAR —")).toBeTruthy();
    // April has not begun, so it has no row rather than an empty one.
    expect(queryByText(/^APR/)).toBeNull();
  });

  it("draws every day those months hold", () => {
    const { getAllByTestId } = render(
      <UnlockCalendarCard calendar={calendar} />,
    );

    expect(getAllByTestId(UNLOCK_DAY_TEST_ID)).toHaveLength(31 + 28 + 5);
  });

  /**
   * Every pixel spent on a margin is a pixel the day cells do not get, and at
   * this width they have none to spare: a card inset like the stats card above
   * it puts the cell at 7.8px, under what four tones need to be told apart.
   * The band runs the full width of the screen instead, and only its own rows
   * hold the grid off the edge.
   */
  it("spends no width on a horizontal margin", () => {
    const { getByTestId } = render(<UnlockCalendarCard calendar={calendar} />);
    const band = getByTestId(UNLOCK_CALENDAR_CARD_TEST_ID);
    const style = StyleSheet.flatten(band.props.style);

    expect(style.marginHorizontal ?? 0).toBe(0);
    expect(style.paddingHorizontal ?? 0).toBe(0);
  });
  /**
   * The tone scale is read over a window that does not match the year the grid
   * draws, so the boundaries have to be written down rather than inferred from
   * the picture — and at a size the 9-pixel cells could never carry (ADR-0007).
   */
  it("prints the numbers behind each tone", () => {
    const { getByText } = render(<UnlockCalendarCard calendar={calendar} />);

    for (const band of ["0", "1-2", "3-5", "6-11", "12+"]) {
      expect(getByText(band)).toBeTruthy();
    }
  });

  it("never falls back on less and more", () => {
    const { queryByText } = render(<UnlockCalendarCard calendar={calendar} />);

    expect(queryByText(/less/i)).toBeNull();
    expect(queryByText(/more/i)).toBeNull();
  });
});
