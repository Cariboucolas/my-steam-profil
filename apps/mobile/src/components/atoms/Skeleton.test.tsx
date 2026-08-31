import { act, render, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, type EmitterSubscription } from "react-native";

import {
  deviceAsksForLessMotion,
  deviceIsFineWithMotion,
  letTheDeviceAnswer,
} from "../../accessibility/reduce-motion.test-support";
import { colors } from "../../theme/tokens";
import { Skeleton, SKELETON_TEST_ID } from "./Skeleton";

/**
 * The swing is handed to the native driver, so its opacity never moves on the
 * JS side and no assertion on the rendered tree can tell a running pulse from a
 * stopped one. What the pulse *is*, observably, is a loop handed to the
 * platform — so that is what these watch.
 */
const watchSwings = () => {
  const swing = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
  jest
    .spyOn(Animated, "loop")
    .mockReturnValue(swing as unknown as Animated.CompositeAnimation);
  return swing;
};

/** Hands back the device's own announcement of a change to the setting. */
const watchAnnouncements = () => {
  let announce: ((enabled: boolean) => void) | undefined;
  jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockImplementation(((_event: string, handler: (enabled: boolean) => void) => {
      announce = handler;
      return { remove: () => {} } as EmitterSubscription;
    }) as unknown as typeof AccessibilityInfo.addEventListener);
  return (enabled: boolean) => act(() => announce?.(enabled));
};

beforeEach(() => {
  deviceIsFineWithMotion();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Skeleton", () => {
  it("takes the width and height it is given", async () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);
    await letTheDeviceAnswer();

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
  it("is drawn in the faintest surface of the palette", async () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);
    await letTheDeviceAnswer();

    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({
      backgroundColor: colors.track,
    });
  });

  it("tells a screen reader that something is loading", async () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);
    await letTheDeviceAnswer();

    expect(getByTestId(SKELETON_TEST_ID).props.accessibilityLabel).toBe("Loading");
  });

  /**
   * Reduced motion is turned on by people a pulse can make ill, and a library
   * open puts hundreds of these on screen at once. The block stays — a row that
   * is waiting must never look like a Game with nothing to earn — it just holds
   * still, at the middle of the swing everybody else sees.
   */
  it("holds the block still, and still a block, when less motion is asked for", async () => {
    deviceAsksForLessMotion();

    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    await waitFor(() => {
      expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({ opacity: 0.675 });
    });
    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({
      backgroundColor: colors.track,
    });
    expect(getByTestId(SKELETON_TEST_ID).props.accessibilityLabel).toBe("Loading");
  });

  /**
   * Not "started and stopped a tick later": a row that asked for less motion
   * must never have had a swing to stop, or several hundred of them animate
   * for the frame it takes the device to answer.
   */
  it("never starts a swing when the device asks for less motion", async () => {
    deviceAsksForLessMotion();
    const swing = watchSwings();

    render(<Skeleton width={44} height={9} />);
    await letTheDeviceAnswer();

    expect(swing.start).not.toHaveBeenCalled();
  });

  it("swings once the device says nothing stands in the way", async () => {
    const swing = watchSwings();

    render(<Skeleton width={44} height={9} />);
    await letTheDeviceAnswer();

    expect(swing.start).toHaveBeenCalled();
  });

  it("starts from the dim end of the swing", async () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);
    await letTheDeviceAnswer();

    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({ opacity: 0.35 });
  });

  it("stops the swing when the setting is turned on while it is on screen", async () => {
    const swing = watchSwings();
    const announce = watchAnnouncements();

    const { getByTestId } = render(<Skeleton width={44} height={9} />);
    await letTheDeviceAnswer();
    expect(swing.start).toHaveBeenCalled();

    await announce(true);

    expect(swing.stop).toHaveBeenCalled();
    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({ opacity: 0.675 });
  });
});
