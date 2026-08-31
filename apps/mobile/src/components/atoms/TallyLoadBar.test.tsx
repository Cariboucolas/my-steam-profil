import { render, waitFor } from "@testing-library/react-native";
import { Animated } from "react-native";

import {
  deviceAsksForLessMotion,
  deviceIsFineWithMotion,
  letTheDeviceAnswer,
} from "../../accessibility/reduce-motion.test-support";
import { colors } from "../../theme/tokens";
import {
  TallyLoadBar,
  TALLY_LOAD_BAR_FILL_TEST_ID,
  TALLY_LOAD_BAR_TEST_ID,
} from "./TallyLoadBar";

/**
 * The slide is handed to the native driver, so the scale it animates never
 * moves on the JS side. What the easing *is*, observably, is a timing handed to
 * the platform with the share it is heading for.
 */
const watchSlides = () => {
  const slide = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
  jest
    .spyOn(Animated, "timing")
    .mockReturnValue(slide as unknown as Animated.CompositeAnimation);
  return slide;
};

beforeEach(() => {
  deviceIsFineWithMotion();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("TallyLoadBar", () => {
  it("is drawn in the accent, on the faintest surface of the palette", async () => {
    const { getByTestId } = render(<TallyLoadBar loaded={0.37} />);
    await letTheDeviceAnswer();

    expect(getByTestId(TALLY_LOAD_BAR_FILL_TEST_ID)).toHaveStyle({
      backgroundColor: colors.accent,
    });
    expect(getByTestId(TALLY_LOAD_BAR_TEST_ID)).toHaveStyle({
      backgroundColor: colors.track,
    });
  });

  /**
   * Waves land six games at a time, so a bar that redrew straight to each new
   * share stepped across the card in visible blocks. It slides to the share
   * instead, and the share is what it is told, not what it works out.
   */
  it("eases to the share that has landed rather than stepping to it", async () => {
    const slide = watchSlides();

    render(<TallyLoadBar loaded={0.37} />);
    await letTheDeviceAnswer();

    expect(slide.start).toHaveBeenCalled();
    expect(Animated.timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0.37 }),
    );
  });

  /**
   * The bar is the one thing on this card that moves, so it is the one thing
   * the setting has to reach. It still shows the share — it just arrives there
   * without travelling.
   */
  it("jumps straight to the share when the device asks for less motion", async () => {
    deviceAsksForLessMotion();
    const slide = watchSlides();

    const { getByTestId } = render(<TallyLoadBar loaded={0.37} />);

    await waitFor(() => {
      const fill = getByTestId(TALLY_LOAD_BAR_FILL_TEST_ID);
      expect(fill.props.style.transform[0].scaleX).toBe(0.37);
    });
    expect(slide.start).not.toHaveBeenCalled();
  });

  /**
   * Null is the hook's word for "nobody is waiting on anything" — before a
   * library has something to count, and once it all landed. A bar with nothing
   * to report is a bar that should not be there.
   */
  it("shows nothing when there is nothing to report", async () => {
    const { queryByTestId } = render(<TallyLoadBar loaded={null} />);
    await letTheDeviceAnswer();

    expect(queryByTestId(TALLY_LOAD_BAR_TEST_ID)).toBeNull();
  });

  /**
   * The card must not appear to change height when the bar goes. Layout is not
   * computed under jest, so this stands in for that: a bar taken out of the
   * flow cannot lend the card height, and cannot take any back either.
   *
   * Held to the card's own edges rather than inset, so the card's radius clips
   * it and the rule reads as part of the border.
   */
  it("sits on the card's top edge, out of the flow", async () => {
    const { getByTestId } = render(<TallyLoadBar loaded={0.5} />);
    await letTheDeviceAnswer();

    expect(getByTestId(TALLY_LOAD_BAR_TEST_ID)).toHaveStyle({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    });
  });
});
