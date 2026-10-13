import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { unlockToneFills } from "../../theme/tokens";
import type { UnlockTone } from "../../view-models/tone-scale";
import { UNLOCK_LEGEND_TEST_ID } from "./UnlockToneLegend";
import { UNLOCK_WEEK_CELL_TEST_ID, UnlockWeekGrid } from "./UnlockWeekGrid";

const quiet = (): UnlockTone[] => Array.from({ length: 24 }, () => 0);
const ROWS = ["S", "M", "T", "W", "T", "F", "S"].map((label, day) => ({
  day,
  label,
  cells: day === 6 ? quiet().map((tone, hour) => (hour === 21 ? 4 : tone)) : quiet(),
}));
const LEGEND = [0, 1, 2, 3, 4].map((tone) => ({ tone: tone as UnlockTone, label: String(tone) }));

describe("UnlockWeekGrid", () => {
  it("draws seven rows of twenty-four slots, each in its tone, with the legend under them", () => {
    render(<UnlockWeekGrid rows={ROWS} legend={LEGEND} />);

    const cells = screen.getAllByTestId(UNLOCK_WEEK_CELL_TEST_ID);
    expect(cells).toHaveLength(7 * 24);
    expect(StyleSheet.flatten(cells[6 * 24 + 21]?.props.style).backgroundColor).toBe(
      unlockToneFills[4],
    );
    expect(StyleSheet.flatten(cells[0]?.props.style).backgroundColor).toBe(unlockToneFills[0]);
    expect(screen.getAllByText("S")).toHaveLength(2);
    expect(screen.getByTestId(UNLOCK_LEGEND_TEST_ID)).toBeTruthy();
  });
});
