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
  effectiveTextScale,
  headlineFits,
  headlineMaxChars,
  headlineRoom,
  HEADLINE_MAX_FONT_SCALE,
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
const onAPhone = (width: number, fontScale = 1) => {
  jest
    .spyOn(ReactNative.Dimensions, "get")
    .mockReturnValue({ width, height: 812, scale: 2, fontScale });
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
    expect(headlineRoom(375, 1)).toBeGreaterThanOrEqual(HEADLINE_REQUIRED_WIDTH);
  });
});

/** Every width the app serves, from the narrowest phone to a tablet. */
const SERVED_WIDTHS = [375, 390, 393, 402, 414, 430, 768, 834, 1024];

/**
 * No growth, the cap itself, and a setting well past it. The last is what
 * proves the cap bites: at every scale below it the clamp is doing nothing,
 * so a property tested only there would pass with the cap removed.
 */
const SERVED_SCALES = [1, HEADLINE_MAX_FONT_SCALE, 2];

/**
 * The promise itself, stated once over the whole space rather than sampled:
 * whatever count a player reaches and whatever phone they hold, what the card
 * writes fits the room the card leaves. Both sides are read from the card —
 * `headlineFits` is the very function the budget is searched with — so this
 * goes red if a gap widens, the ring grows, the font size rises, or the
 * cascade in `formatUnlockHeadline` loses a form.
 */
describe("the headline always fits", () => {
  const cases = SERVED_WIDTHS.flatMap((width) =>
    SERVED_SCALES.map((fontScale) => [width, fontScale] as const),
  );

  it.each(cases)("at %i px and a text size of %s", (width, fontScale) => {
    const scale = effectiveTextScale(fontScale);
    const budget = headlineMaxChars(width, scale);

    for (let unlocked = 0; unlocked <= 1_000_000; unlocked += 137) {
      const written = formatUnlockHeadline(unlocked, budget);
      const fits = headlineFits(written.length, width, scale);
      expect({ unlocked, written, fits }).toEqual({ unlocked, written, fits: true });
    }
  });
});

/**
 * The clamp exists twice: here, and natively in React Native's own
 * `maxFontSizeMultiplier` (ADR-0012). Nothing can collapse the two, so this
 * pins them together — if the card ever renders a multiplier the model does
 * not assume, the model goes on predicting for a size nobody is painting.
 */
describe("the cap the model assumes", () => {
  it("is the one both halves of the headline row are drawn under", async () => {
    onAPhone(375);
    const { getByText } = render(
      <LibraryStatsCard summary={summary()} gameCount={267} loaded={null} />,
    );
    await letTheDeviceAnswer();

    for (const node of [getByText("1 284"), getByText("achievements\nunlocked")]) {
      expect(node.props.maxFontSizeMultiplier).toBe(HEADLINE_MAX_FONT_SCALE);
    }
  });

  it("stops the figure growing past what the narrowest phone can hold", () => {
    expect(effectiveTextScale(2)).toBe(HEADLINE_MAX_FONT_SCALE);
    expect(effectiveTextScale(1)).toBe(1);
  });

  /**
   * The one figure in this file written down rather than derived, and it is
   * written down in ADR-0012 too. Pinned so the two cannot part company: this
   * going red means the cap moved, and the ADR's table needs the same edit —
   * not that the number here should be updated to match.
   */
  it("is the 1.13 the decision was recorded with", () => {
    expect(HEADLINE_MAX_FONT_SCALE).toBe(1.13);
    expect(headlineMaxChars(375, HEADLINE_MAX_FONT_SCALE)).toBe(4);
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
