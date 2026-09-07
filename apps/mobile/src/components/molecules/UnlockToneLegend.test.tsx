import { render } from "@testing-library/react-native";

import { unlockToneFills } from "../../theme/tokens";
import type { UnlockToneBand } from "../../view-models/unlock-calendar";
import {
  UnlockToneLegend,
  UNLOCK_LEGEND_SWATCH_TEST_ID,
} from "./UnlockToneLegend";

/** The scale ADR-0007 names, as the builder hands it over. */
const legend: readonly UnlockToneBand[] = [
  { tone: 0, label: "0" },
  { tone: 1, label: "1-2" },
  { tone: 2, label: "3-5" },
  { tone: 3, label: "6-11" },
  { tone: 4, label: "12+" },
];

describe("UnlockToneLegend", () => {
  it("writes the counts each band stands for", () => {
    const { getByText } = render(<UnlockToneLegend legend={legend} />);

    for (const band of legend) {
      expect(getByText(band.label)).toBeTruthy();
    }
  });

  it("paints each band's swatch in the fill that band's days take", () => {
    const { getAllByTestId } = render(<UnlockToneLegend legend={legend} />);
    const swatches = getAllByTestId(UNLOCK_LEGEND_SWATCH_TEST_ID);

    // A legend whose swatches are not the grid's own fills is worse than none:
    // it would name boundaries for tones the reader cannot match to a cell.
    expect(swatches.map((swatch) => swatch.props.style.backgroundColor)).toEqual(
      [...unlockToneFills],
    );
  });
});
