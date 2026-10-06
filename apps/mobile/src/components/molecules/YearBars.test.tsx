import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { YearBar } from "../../view-models/years-and-cumulative";
import { RUNNING_TOTAL_TEST_ID, SCALE_LINE_TEST_ID, YearBars } from "./YearBars";

const bar = (year: number, over: Partial<YearBar> = {}): YearBar => ({
  year,
  label: `’${String(year).slice(2)}`,
  figure: null,
  amount: "12",
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
        scale={[]}
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
        scale={[]}
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
        scale={[]}
        screenReaderLabel="chart"
      />,
    );
    expect(screen.getByText("1 104")).toBeTruthy();
  });

  /**
   * Seventeen years on a phone leave each bar about 13 px: a label or a figure
   * held to that wraps or is cut short. Each is given its own width instead,
   * centred over its bar, and spills over the bars beside it.
   */
  it("gives labels and figures a width of their own, on one line", () => {
    const years = Array.from({ length: 17 }, (_, index) => 2010 + index);
    render(
      <YearBars
        bars={years.map((year) => bar(year, { figure: year === 2026 ? "1 104" : null }))}
        cumulative={null}
        scale={[]}
        screenReaderLabel="chart"
      />,
    );
    for (const text of [screen.getByText("’10"), screen.getByText("1 104")]) {
      expect(text.props.numberOfLines).toBe(1);
      expect(StyleSheet.flatten(text.props.style)).toEqual(
        expect.objectContaining({
          width: expect.any(Number),
          // react-native-web caps a one-line text at its parent's width
          // unless the text says otherwise.
          maxWidth: expect.any(Number),
          textAlign: "center",
        }),
      );
    }
  });

  it("draws the running total when it has one, and none without", () => {
    const { rerender } = render(
      <YearBars
        bars={[bar(2025), bar(2026)]}
        cumulative={[0.5, 1]}
        scale={[]}
        screenReaderLabel="chart"
      />,
    );
    expect(screen.getByTestId(RUNNING_TOTAL_TEST_ID)).toBeTruthy();

    rerender(
      <YearBars bars={[bar(2026)]} cumulative={null} scale={[]} screenReaderLabel="chart" />,
    );
    expect(screen.queryByTestId(RUNNING_TOTAL_TEST_ID)).toBeNull();
  });

  it("draws a guide line at each amount it is given, written at its height", () => {
    render(
      <YearBars
        bars={[bar(2025, { share: 1 })]}
        cumulative={null}
        scale={[
          { label: "250", share: 0.25 },
          { label: "500", share: 0.5 },
        ]}
        screenReaderLabel="chart"
      />,
    );
    expect(screen.getAllByTestId(SCALE_LINE_TEST_ID)).toHaveLength(2);
    expect(screen.getByText("250")).toBeTruthy();
    expect(screen.getByText("500")).toBeTruthy();
  });
});
