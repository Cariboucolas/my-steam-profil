import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Whether the player has asked their device for less motion.
 *
 * The device is asked once on mount and then announces its own changes, so the
 * setting costs one read per component rather than a poll — which matters when
 * a library open mounts one of these per row.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    /** Set once the first answer stops being worth acting on. */
    let superseded = false;

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        // An announcement is newer than a read still in flight, so it wins.
        superseded = true;
        setReduceMotion(enabled);
      },
    );

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      // Nothing to say when the device wants motion: that is the state this
      // hook already starts on, and staying put spares every mounted row a
      // render that would land on the value it is already showing.
      if (!superseded && enabled) {
        setReduceMotion(true);
      }
    });

    return () => {
      superseded = true;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
