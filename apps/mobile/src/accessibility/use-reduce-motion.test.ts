import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, type EmitterSubscription } from "react-native";

import {
  deviceAsksForLessMotion,
  deviceIsFineWithMotion,
  letTheDeviceAnswer,
} from "./reduce-motion.test-support";
import { useReduceMotion } from "./use-reduce-motion";

type ReduceMotionListener = (enabled: boolean) => void;

/**
 * AccessibilityInfo.addEventListener carries one overload per event and a spy
 * binds to the first of them, so it has to be narrowed to the event this hook
 * listens for before the handler can be called with a boolean.
 */
const spyOnListening = () =>
  jest.spyOn(AccessibilityInfo, "addEventListener") as unknown as jest.SpyInstance<
    EmitterSubscription,
    [event: string, handler: ReduceMotionListener]
  >;

const subscription = (remove: () => void) =>
  ({ remove }) as unknown as EmitterSubscription;

beforeEach(() => {
  // Both platform functions are shared mocks that outlive the test that set
  // them, so each test starts from a device that has been told nothing.
  deviceIsFineWithMotion();
  spyOnListening().mockImplementation(() => subscription(() => {}));
});

describe("useReduceMotion", () => {
  /**
   * The device can only be asked asynchronously, and a caller that took silence
   * for "motion is fine" would animate for the frame it takes to answer — in
   * front of the one player who asked it not to.
   */
  it("says nothing until the device has answered", () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useReduceMotion());

    expect(result.current).toBeUndefined();
  });

  it("answers what the device says once it has asked", async () => {
    deviceAsksForLessMotion();

    const { result } = renderHook(() => useReduceMotion());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("follows the setting when it is changed while the app is open", async () => {
    deviceAsksForLessMotion();
    let announce: ReduceMotionListener | undefined;
    spyOnListening().mockImplementation((event, handler) => {
      if (event === "reduceMotionChanged") {
        announce = handler;
      }
      return subscription(() => {});
    });

    const { result } = renderHook(() => useReduceMotion());
    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    act(() => {
      announce?.(false);
    });

    expect(result.current).toBe(false);
  });

  /**
   * A library open mounts one of these per row and the list unmounts them as it
   * scrolls, so a listener left behind is a listener per row that was ever seen.
   */
  it("stops listening once the component that asked has gone", () => {
    const remove = jest.fn();
    spyOnListening().mockReturnValue(subscription(remove));

    const { unmount } = renderHook(() => useReduceMotion());
    unmount();

    expect(remove).toHaveBeenCalled();
  });

  /**
   * The device is asked once and announces changes separately, and nothing
   * orders the two. A change that arrives while the first answer is still in
   * flight is the fresher truth and must survive it landing.
   */
  it("keeps a change that arrives before the device has answered", async () => {
    let answer: ((enabled: boolean) => void) | undefined;
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockReturnValue(
        new Promise((resolve) => {
          answer = resolve;
        }),
      );
    let announce: ReduceMotionListener | undefined;
    spyOnListening().mockImplementation((event, handler) => {
      if (event === "reduceMotionChanged") {
        announce = handler;
      }
      return subscription(() => {});
    });

    const { result } = renderHook(() => useReduceMotion());
    act(() => {
      announce?.(true);
    });
    expect(result.current).toBe(true);

    await act(async () => {
      answer?.(false);
    });

    expect(result.current).toBe(true);
  });

  /**
   * react-native-web hands back nothing at all from addEventListener when
   * matchMedia is missing — no DOM, which is what static rendering is — and
   * its types do not admit it. Unmounting must not take the screen down.
   */
  it("survives a platform that hands back no subscription", () => {
    spyOnListening().mockReturnValue(undefined as unknown as EmitterSubscription);

    const { unmount } = renderHook(() => useReduceMotion());

    expect(() => unmount()).not.toThrow();
  });
});

