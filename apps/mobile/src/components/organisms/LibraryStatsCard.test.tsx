import { render } from "@testing-library/react-native";

import type { LibrarySummary } from "../../view-models/library";
import {
  TALLY_LOAD_BAR_FILL_TEST_ID,
  TALLY_LOAD_BAR_TEST_ID,
} from "../atoms/TallyLoadBar";
import { LibraryStatsCard } from "./LibraryStatsCard";

const summary = (over: Partial<LibrarySummary> = {}): LibrarySummary => ({
  unlocked: 1284,
  total: 3471,
  rateLabel: "37%",
  fraction: "1 284 / 3 471",
  perfectGames: 12,
  playtimeLabel: "3 128 h",
  ...over,
});

describe("LibraryStatsCard", () => {
  it("shows the figures it was given", () => {
    const { getByText } = render(
      <LibraryStatsCard summary={summary()} gameCount={267} loaded={null} />,
    );

    expect(getByText("1 284")).toBeTruthy();
    expect(getByText("37%")).toBeTruthy();
    expect(getByText("267")).toBeTruthy();
  });

  /**
   * The figures climb as waves of tallies land, which says nothing about how
   * much is still coming. The bar is what says it.
   */
  it("shows how far the tallies have got while they are landing", () => {
    const { getByTestId } = render(
      <LibraryStatsCard summary={summary()} gameCount={267} loaded={0.4} />,
    );

    expect(getByTestId(TALLY_LOAD_BAR_FILL_TEST_ID)).toHaveStyle({ width: "40%" });
  });

  it("carries no bar once nothing is outstanding", () => {
    const { queryByTestId } = render(
      <LibraryStatsCard summary={summary()} gameCount={267} loaded={null} />,
    );

    expect(queryByTestId(TALLY_LOAD_BAR_TEST_ID)).toBeNull();
  });
});
