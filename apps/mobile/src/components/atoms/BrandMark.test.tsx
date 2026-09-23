import { render } from "@testing-library/react-native";

import {
  BrandMark,
  MARK_STOPS,
  MARK_STOP_TEST_ID,
  MARK_TIP_TEST_ID,
  MARK_TRACK_TEST_ID,
} from "./BrandMark";
import { MARK_STOP_COUNT } from "../../splash/splash-timing";

/**
 * The mark is hidden from the accessibility tree on purpose, and the library
 * skips hidden subtrees unless told otherwise. Everything structural here has
 * to look past that; that it is hidden at all has a test of its own below.
 */
const DRAWN = { includeHiddenElements: true } as const;

describe("MARK_STOPS", () => {
  /** The schedule counts them out one by one; the two must agree. */
  it("has the stop the schedule expects", () => {
    expect(MARK_STOPS).toHaveLength(MARK_STOP_COUNT);
  });

  it("runs from the darkest amber to the lightest", () => {
    expect(MARK_STOPS[0]?.colour).toBe("#c98634");
    expect(MARK_STOPS[MARK_STOPS.length - 1]?.colour).toBe("#f6cf9b");
  });

  /** Each stop sits one step further round than the one before it. */
  it("walks round the circle without going back on itself", () => {
    const offsets = MARK_STOPS.map((stop) => stop.dashOffset);
    const sorted = [...offsets].sort((a, b) => b - a);
    expect(offsets).toEqual(sorted);
  });
});

describe("BrandMark", () => {
  /**
   * The unlit ring the arc is drawn over. It is the whole shape from the first
   * frame, so the mark never appears to grow — only to fill.
   */
  it("draws its track before any stop has landed", () => {
    const { getByTestId } = render(<BrandMark size={112} stops={0} tip={false} />);
    expect(getByTestId(MARK_TRACK_TEST_ID, DRAWN)).toBeTruthy();
  });

  it("draws nothing of the arc before any stop has landed", () => {
    const { queryAllByTestId } = render(
      <BrandMark size={112} stops={0} tip={false} />,
    );
    expect(queryAllByTestId(MARK_STOP_TEST_ID, DRAWN)).toHaveLength(0);
  });

  it("draws exactly as many stops as it is given", () => {
    const { queryAllByTestId } = render(
      <BrandMark size={112} stops={5} tip={false} />,
    );
    expect(queryAllByTestId(MARK_STOP_TEST_ID, DRAWN)).toHaveLength(5);
  });

  it("draws the whole arc when every stop has landed", () => {
    const { queryAllByTestId } = render(
      <BrandMark size={112} stops={MARK_STOP_COUNT} tip />,
    );
    expect(queryAllByTestId(MARK_STOP_TEST_ID, DRAWN)).toHaveLength(MARK_STOP_COUNT);
  });

  /**
   * A caller that has lost count must not be able to ask for an arc the mark
   * does not have, nor for a negative one.
   */
  it("draws no more stops than it has, however many it is asked for", () => {
    const { queryAllByTestId } = render(
      <BrandMark size={112} stops={99} tip={false} />,
    );
    expect(queryAllByTestId(MARK_STOP_TEST_ID, DRAWN)).toHaveLength(MARK_STOP_COUNT);
  });

  it("draws no stops at all when asked for fewer than none", () => {
    const { queryAllByTestId } = render(
      <BrandMark size={112} stops={-4} tip={false} />,
    );
    expect(queryAllByTestId(MARK_STOP_TEST_ID, DRAWN)).toHaveLength(0);
  });

  it("holds the tip back until it is told to draw it", () => {
    const { queryByTestId } = render(
      <BrandMark size={112} stops={MARK_STOP_COUNT} tip={false} />,
    );
    expect(queryByTestId(MARK_TIP_TEST_ID, DRAWN)).toBeNull();
  });

  it("draws the tip when it is told to", () => {
    const { getByTestId } = render(
      <BrandMark size={112} stops={MARK_STOP_COUNT} tip />,
    );
    expect(getByTestId(MARK_TIP_TEST_ID, DRAWN)).toBeTruthy();
  });

  /**
   * The mark is a logo, not a figure. Nothing in it is worth announcing, and a
   * reader listening to the app gets the wordmark beside it instead.
   */
  it("says nothing to a reader who is listening", () => {
    const { queryByTestId } = render(
      <BrandMark size={112} stops={MARK_STOP_COUNT} tip />,
    );

    // Drawn, and out of the traversal: the same node answers both ways round.
    expect(queryByTestId(MARK_TRACK_TEST_ID, DRAWN)).toBeTruthy();
    expect(queryByTestId(MARK_TRACK_TEST_ID)).toBeNull();
  });
});
