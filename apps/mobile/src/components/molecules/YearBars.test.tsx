import { render, screen } from "@testing-library/react-native";

import type { YearBar } from "../../view-models/years-and-cumulative";
import { RUNNING_TOTAL_TEST_ID, YearBars } from "./YearBars";

const bar = (year: number, over: Partial<YearBar> = {}): YearBar => ({
  year,
  label: `’${String(year).slice(2)}`,
  figure: null,
  share: 0.5,
  current: false,
  ...over,
});

describe("YearBars", () => {
  it("is one screen-reader stop for the whole chart", () => {
    render(
      <YearBars
        bars={[bar(2025), bar(2026, { current: true })]}
        cumulative={[0.5, 1]}
        screenReaderLabel="2025 to 2026"
      />,
    );
    expect(screen.getByLabelText("2025 to 2026")).toBeTruthy();
  });

  it("writes the axis labels it is given and skips the others", () => {
    render(
      <YearBars
        bars={[bar(2024, { label: null }), bar(2025)]}
        cumulative={[0.5, 1]}
        screenReaderLabel="chart"
      />,
    );
    expect(screen.getByText("’25")).toBeTruthy();
    expect(screen.queryByText("’24")).toBeNull();
  });

  it("writes the figures it is given over their bars", () => {
    render(
      <YearBars
        bars={[bar(2025, { figure: "1 104" })]}
        cumulative={null}
        screenReaderLabel="chart"
      />,
    );
    expect(screen.getByText("1 104")).toBeTruthy();
  });

  it("draws the running total when it has one, and none without", () => {
    const { rerender } = render(
      <YearBars bars={[bar(2025), bar(2026)]} cumulative={[0.5, 1]} screenReaderLabel="chart" />,
    );
    expect(screen.getByTestId(RUNNING_TOTAL_TEST_ID)).toBeTruthy();

    rerender(<YearBars bars={[bar(2026)]} cumulative={null} screenReaderLabel="chart" />);
    expect(screen.queryByTestId(RUNNING_TOTAL_TEST_ID)).toBeNull();
  });
});
