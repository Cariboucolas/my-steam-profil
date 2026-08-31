import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Whether the player has asked their device for less motion, or `undefined`
 * while the device has yet to say.
 *
 * The device is asked once on mount and then announces its own changes, so the
 * setting costs one read per component rather than a poll — which matters when
 * a library open mounts one of these per row.
 *
 * The unanswered state is not a detail callers may skip. The device can only be
 * asked asynchronously, so a hook that started on `false` would have every
 * caller animate for the frame it takes to answer, in front of the one player
 * who asked it not to.
 */
export const useReduceMotion = (): boolean | undefined => {
  const [reduceMotion, setReduceMotion] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    /** Set once the first answer stops being worth acting on. */
    let superseded = false;

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        // An announcement is newer than a read still in flight, so it wins:
        // nothing orders the two, and a stale read must not undo a change the
        // player has just made.
        superseded = true;
        setReduceMotion(enabled);
      },
    );

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!superseded) {
        setReduceMotion(enabled);
      }
    });

    return () => {
      superseded = true;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};
