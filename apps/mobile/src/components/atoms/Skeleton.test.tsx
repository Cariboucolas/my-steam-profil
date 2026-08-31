import { render, waitFor } from "@testing-library/react-native";

import { deviceAsksForLessMotion } from "../../accessibility/reduce-motion.test-support";
import { colors } from "../../theme/tokens";
import { Skeleton, SKELETON_TEST_ID } from "./Skeleton";

beforeEach(() => {
  deviceAsksForLessMotion(false);
});

describe("Skeleton", () => {
  it("takes the width and height it is given", () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({
      width: 44,
      height: 9,
    });
  });

  /**
   * A skeleton stands where a value will be, so it has to read as absence
   * rather than as a value. It uses the same track colour an empty progress bar
   * does, which is the faintest surface in the palette.
   */
  it("is drawn in the faintest surface of the palette", () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({
      backgroundColor: colors.track,
    });
  });

  it("tells a screen reader that something is loading", () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    expect(getByTestId(SKELETON_TEST_ID).props.accessibilityLabel).toBe("Loading");
  });

  /**
   * Reduced motion is turned on by people a pulse can make ill, and a library
   * open puts hundreds of these on screen at once. The block stays — a row that
   * is waiting must never look like a Game with nothing to earn — it just holds
   * still, at the middle of the swing everybody else sees.
   */
  it("holds still at the middle of its swing when the device asks for less motion", async () => {
    deviceAsksForLessMotion(true);

    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    await waitFor(() => {
      expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({ opacity: 0.675 });
    });
  });

  it("still reads as a block that is waiting, with less motion asked for", async () => {
    deviceAsksForLessMotion(true);

    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    await waitFor(() => {
      expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({ opacity: 0.675 });
    });
    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({
      width: 44,
      height: 9,
      backgroundColor: colors.track,
    });
    expect(getByTestId(SKELETON_TEST_ID).props.accessibilityLabel).toBe("Loading");
  });

  it("swings from the dim end of the pulse when no less motion is asked for", () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({ opacity: 0.35 });
  });
});

