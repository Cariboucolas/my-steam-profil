import { render } from "@testing-library/react-native";

import { UnlockCalendarHeader } from "./UnlockCalendarHeader";

/** A year in April, set against a finished one, as the builder hands it over. */
const header = {
  total: 82,
  frameLabel: "YEAR 2026 · JAN → DEC",
  deltaLabel: "-224 vs all of 2025 (306)",
} as const;

describe("UnlockCalendarHeader", () => {
  it("states the running year under the card's own name", () => {
    const { getByText } = render(<UnlockCalendarHeader {...header} />);

    expect(getByText("Activity")).toBeTruthy();
    expect(getByText("82")).toBeTruthy();
  });

  it("names the year and how far it runs", () => {
    const { getByText } = render(<UnlockCalendarHeader {...header} />);

    expect(getByText("YEAR 2026 · JAN → DEC")).toBeTruthy();
  });

  /**
   * The comparison is written for it, "all of" included: the header draws the
   * sentence it is handed rather than assembling one of its own, so there is
   * one place where the words that keep it honest can go missing.
   */
  it("sets the running year against all of the one before", () => {
    const { getByText } = render(<UnlockCalendarHeader {...header} />);

    expect(getByText("-224 vs all of 2025 (306)")).toBeTruthy();
  });

  it("says nothing at all where there is no year to compare", () => {
    const { getByText, queryByText } = render(
      <UnlockCalendarHeader {...header} deltaLabel={null} />,
    );

    // The rest of the header stands: a new player is told where they are,
    // just not measured against a year they were not there for.
    expect(getByText("82")).toBeTruthy();
    expect(getByText("YEAR 2026 · JAN → DEC")).toBeTruthy();
    expect(queryByText(/vs/)).toBeNull();
  });
});
