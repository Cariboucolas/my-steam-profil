import { AccessibilityInfo } from "react-native";

/**
 * Says what the device answers when asked about reduced motion.
 *
 * The platform module arrives from the test preset as jest mock functions
 * already, so `jest.spyOn` mutates a shared mock rather than replacing a real
 * function and `restoreAllMocks` has nothing to put back: an answer set by one
 * test outlives it. Every test that renders anything animated has to state the
 * answer it wants, which is what this is for.
 */
export const deviceAsksForLessMotion = (enabled: boolean): void => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(enabled);
};
