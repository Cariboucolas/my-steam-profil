import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "../../theme/tokens";
import type { HourBar } from "../../view-models/unlock-week";
import { HOUR_BAR_TEST_ID, HourBars } from "./HourBars";

const HOURS: HourBar[] = Array.from({ length: 24 }, (_, hour) => ({
  share: hour === 21 ? 1 : hour === 9 ? 0.5 : 0,
  busiest: hour === 21,
  figure: hour === 21 ? "642" : null,
  tick: hour % 2 === 0 ? `${hour}h` : null,
}));

describe("HourBars", () => {
  it("draws twenty-four bars, the busiest in the full accent with its total over it", () => {
    render(<HourBars hours={HOURS} scale={[{ label: "500", share: 500 / 642 }]} />);

    const bars = screen.getAllByTestId(HOUR_BAR_TEST_ID);
    expect(bars).toHaveLength(24);
    expect(StyleSheet.flatten(bars[21]?.props.style).backgroundColor).toBe(colors.accent);
    expect(StyleSheet.flatten(bars[9]?.props.style).backgroundColor).not.toBe(colors.accent);
    expect(screen.getByText("642")).toBeTruthy();
    expect(screen.getByText("500")).toBeTruthy();
    expect(["0h", "12h", "22h"].map((tick) => screen.getByText(tick))).toHaveLength(3);
  });

  it("keeps an empty hour visible as a sliver", () => {
    render(<HourBars hours={HOURS} scale={[]} />);

    expect(
      StyleSheet.flatten(screen.getAllByTestId(HOUR_BAR_TEST_ID)[0]?.props.style).height,
    ).toBeGreaterThan(0);
  });
});
