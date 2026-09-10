import * as ReactNative from "react-native";
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
import { formatUnlockHeadline } from "../../view-models/library";
import {
  headlineFits,
  headlineMaxChars,
  headlineRoom,
  HEADLINE_REQUIRED_WIDTH,
  LibraryStatsCard,
  LIBRARY_STATS_CARD_TEST_ID,
} from "./LibraryStatsCard";

const summary = (over: Partial<LibrarySummary> = {}): LibrarySummary => ({
  unlocked: 1284,
  unlockedScreenReaderLabel: "1 284 achievements unlocked",
  total: 3471,
  rateLabel: "37%",
  fraction: "1 284 / 3 471 across 267 games counted",
  perfectGames: 12,
  playtimeLabel: "3 128 h",
  ...over,
});

/**
 * The card reads the screen's width to know how much of the figure it can
 * write, so a test that cares about the headline has to say which phone it is
 * on. Everything else renders at whatever the preset provides.
 */
const onAPhone = (width: number) => {
  jest
    .spyOn(ReactNative.Dimensions, "get")
    .mockReturnValue({ width, height: 812, scale: 2, fontScale: 1 });
};

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

/**
 * The count of a player's unlocks is the one figure on this screen that must
 * never break across two lines: a wrapped `4 127` reads as two numbers. The
 * headline row flexes, so nothing in the rendered tree says how much width it
 * was left — `headlineRoom` works that out from the card's own margins,
 * padding, gaps and ring, and 375 px is the narrowest phone the app serves.
 *
 * Both sides are read from the card, never written down here: the room from
 * the layout, the demand from the size and letter spacing the headline is
 * actually painted at, plus the margin the width model is allowed. Widen a
 * gap, restore the old padding, enlarge the ring or raise the font size and
 * this goes red.
 */
describe("headlineRoom", () => {
  it("holds the figure the cascade cannot shorten, on the narrowest phone", () => {
    expect(headlineRoom(375)).toBeGreaterThanOrEqual(HEADLINE_REQUIRED_WIDTH);
  });
});

/** Every width the app serves, from the narrowest phone to a tablet. */
const SERVED_WIDTHS = [375, 390, 393, 402, 414, 430, 768, 834, 1024];

/**
 * The promise itself, stated once over the whole space rather than sampled:
 * whatever count a player reaches and whatever phone they hold, what the card
 * writes fits the room the card leaves. Both sides are read from the card —
 * `headlineFits` is the very function the budget is searched with — so this
 * goes red if a gap widens, the ring grows, the font size rises, or the
 * cascade in `formatUnlockHeadline` loses a form.
 */
describe("the headline always fits", () => {
  it.each(SERVED_WIDTHS)("at %i px, for any count a player can reach", (width) => {
    const budget = headlineMaxChars(width);

    for (let unlocked = 0; unlocked <= 1_000_000; unlocked += 137) {
      const written = formatUnlockHeadline(unlocked, budget);
      expect({ unlocked, written, fits: headlineFits(written.length, width) }).toEqual({
        unlocked,
        written,
        fits: true,
      });
    }
  });
});

/**
 * The same promise as the reader meets it, on the two phones where the answer
 * differs. 45 500 is six characters: it fits at 430 px and does not at 375.
 */
describe("the headline, on a real phone", () => {
  const player = summary({
    unlocked: 45_500,
    unlockedScreenReaderLabel: "45 500 achievements unlocked",
  });

  it("writes the figure in full when the phone is wide enough", async () => {
    onAPhone(430);
    const { getByText } = render(
      <LibraryStatsCard summary={player} gameCount={267} loaded={null} />,
    );
    await letTheDeviceAnswer();

    expect(getByText("45 500")).toBeTruthy();
  });

  it("writes it short when it is not", async () => {
    onAPhone(375);
    const { getByText } = render(
      <LibraryStatsCard summary={player} gameCount={267} loaded={null} />,
    );
    await letTheDeviceAnswer();

    expect(getByText("45.5K")).toBeTruthy();
  });

  it("gives a screen reader the exact count, however it was written", async () => {
    onAPhone(375);
    const { getByLabelText } = render(
      <LibraryStatsCard summary={player} gameCount={267} loaded={null} />,
    );
    await letTheDeviceAnswer();

    expect(getByLabelText("45 500 achievements unlocked")).toBeTruthy();
  });
});
