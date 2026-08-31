import { render, waitFor } from "@testing-library/react-native";

import {
  deviceAsksForLessMotion,
  deviceIsFineWithMotion,
  letTheDeviceAnswer,
} from "../../accessibility/reduce-motion.test-support";

import type { LibrarySummary } from "../../view-models/library";
import {
  TALLY_LOAD_BAR_FILL_TEST_ID,
  TALLY_LOAD_BAR_TEST_ID,
} from "../atoms/TallyLoadBar";
import {
  LibraryStatsCard,
  LIBRARY_STATS_CARD_TEST_ID,
} from "./LibraryStatsCard";

const summary = (over: Partial<LibrarySummary> = {}): LibrarySummary => ({
  unlocked: 1284,
  total: 3471,
  rateLabel: "37%",
  fraction: "1 284 / 3 471",
  perfectGames: 12,
  playtimeLabel: "3 128 h",
  ...over,
});

beforeEach(() => {
  deviceIsFineWithMotion();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("LibraryStatsCard", () => {
  it("shows the figures it was given", async () => {
    const { getByText } = render(
      <LibraryStatsCard summary={summary()} gameCount={267} loaded={null} />,
    );
    await letTheDeviceAnswer();

    expect(getByText("1 284")).toBeTruthy();
    expect(getByText("37%")).toBeTruthy();
    expect(getByText("267")).toBeTruthy();
  });

  /**
   * The figures climb as waves of tallies land, which says nothing about how
   * much is still coming. The bar is what says it.
   */
  it("shows how far the tallies have got while they are landing", async () => {
    // Asked without motion, so the share is a plain number in the tree rather
    // than a scale the native driver is still travelling towards.
    deviceAsksForLessMotion();

    const { getByTestId } = render(
      <LibraryStatsCard summary={summary()} gameCount={267} loaded={0.4} />,
    );

    await waitFor(() => {
      const fill = getByTestId(TALLY_LOAD_BAR_FILL_TEST_ID);
      expect(fill.props.style.transform[0].scaleX).toBe(0.4);
    });
  });

  it("carries no bar once nothing is outstanding", async () => {
    const { queryByTestId } = render(
      <LibraryStatsCard summary={summary()} gameCount={267} loaded={null} />,
    );
    await letTheDeviceAnswer();

    expect(queryByTestId(TALLY_LOAD_BAR_TEST_ID)).toBeNull();
  });

  /**
   * The bar lies on the card's top edge rather than inside its padding, so the
   * card has to clip it: without this it would run straight across the rounded
   * corners instead of following them.
   */
  it("clips what lies on its edges to its own corners", async () => {
    const { getByTestId } = render(
      <LibraryStatsCard summary={summary()} gameCount={267} loaded={0.4} />,
    );
    await letTheDeviceAnswer();

    expect(getByTestId(LIBRARY_STATS_CARD_TEST_ID)).toHaveStyle({
      overflow: "hidden",
    });
  });
});

