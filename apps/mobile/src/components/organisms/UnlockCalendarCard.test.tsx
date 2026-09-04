import { render } from "@testing-library/react-native";

import { UNLOCK_DAY_TEST_ID } from "../molecules/UnlockMonthRow";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import { UnlockCalendarCard } from "./UnlockCalendarCard";

/** A year that has reached the 5th of March. */
const calendar: UnlockCalendar = {
  months: ["JAN", "FEB", "MAR"].map((label, index) => ({
    label,
    current: label === "MAR",
    days: Array.from({ length: 31 }, (_, day) =>
      day + 1 > [31, 28, 5][index]! ? null : { count: 0 },
    ),
  })),
};

describe("UnlockCalendarCard", () => {
  it("draws a row for every month the year has reached", () => {
    const { getByText, queryByText } = render(
      <UnlockCalendarCard calendar={calendar} />,
    );

    expect(getByText("JAN")).toBeTruthy();
    expect(getByText("MAR")).toBeTruthy();
    // April has not begun, so it has no row rather than an empty one.
    expect(queryByText("APR")).toBeNull();
  });

  it("draws every day those months hold", () => {
    const { getAllByTestId } = render(
      <UnlockCalendarCard calendar={calendar} />,
    );

    expect(getAllByTestId(UNLOCK_DAY_TEST_ID)).toHaveLength(31 + 28 + 5);
  });
});
