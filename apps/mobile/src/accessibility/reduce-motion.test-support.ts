import { act } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

/**
 * Says what the device answers when asked about reduced motion.
 *
 * The platform module arrives from the test preset as jest mock functions
 * already, so `jest.spyOn` mutates a shared mock rather than replacing a real
 * function and `restoreAllMocks` has nothing to put back: an answer set by one
 * test outlives it. Every test that renders anything animated has to state the
 * answer it wants, which is what these are for.
 */
const deviceAnswers = (enabled: boolean): void => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(enabled);
};

export const deviceAsksForLessMotion = (): void => deviceAnswers(true);

export const deviceIsFineWithMotion = (): void => deviceAnswers(false);

/**
 * Waits for that answer to land. The device can only be asked asynchronously,
 * so a test that ends before the answer arrives is a test whose component
 * updates after it, and it never sees the setting it asked for.
 */
export const letTheDeviceAnswer = (): Promise<void> => act(async () => {});
