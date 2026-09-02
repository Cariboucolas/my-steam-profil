import { render } from "@testing-library/react-native";
import { Animated } from "react-native";

import {
  ScrollRail,
  SCROLL_RAIL_TEST_ID,
  SCROLL_RAIL_THUMB_TEST_ID,
} from "./ScrollRail";

const railWith = (contentWidth: number, viewportWidth: number) =>
  render(
    <ScrollRail
      contentWidth={contentWidth}
      viewportWidth={viewportWidth}
      scrolled={new Animated.Value(0)}
    />,
  );

describe("ScrollRail", () => {
  it("draws a thumb when there is more than can be seen", () => {
    const { queryByTestId } = railWith(1200, 300);

    expect(queryByTestId(SCROLL_RAIL_THUMB_TEST_ID)).toBeTruthy();
  });

  it("draws no thumb when everything already fits", () => {
    const { queryByTestId } = railWith(280, 300);

    expect(queryByTestId(SCROLL_RAIL_THUMB_TEST_ID)).toBeNull();
  });

  it("draws no thumb before it has been measured", () => {
    const { queryByTestId } = railWith(0, 0);

    expect(queryByTestId(SCROLL_RAIL_THUMB_TEST_ID)).toBeNull();
  });

  /**
   * The rail is under a list of several hundred rows. If it took its height
   * only when it had something to draw, every change of duration would shift
   * that whole list — a screen moving to say something about a grid.
   */
  it("keeps the same height whether or not it has a thumb to draw", () => {
    const heightOf = (contentWidth: number) =>
      railWith(contentWidth, 300).getByTestId(SCROLL_RAIL_TEST_ID).props.style
        .height;

    expect(heightOf(1200)).toBe(heightOf(280));
  });

  const thumbWidthOf = (contentWidth: number): number =>
    railWith(contentWidth, 300).getByTestId(SCROLL_RAIL_THUMB_TEST_ID).props
      .style.width;

  it("shows how much there is by how short the thumb is", () => {
    expect(thumbWidthOf(1200)).toBeLessThan(thumbWidthOf(600));
  });

  it("never shrinks the thumb past being grabbable", () => {
    expect(thumbWidthOf(100_000)).toBeGreaterThan(20);
  });
});
