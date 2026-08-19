import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors } from "../../theme/tokens";

export const RING_PROGRESS_TEST_ID = "completion-ring-progress";

const FULL = 100;
/** SVG arcs start at 3 o'clock; the mock starts them at 12. */
const START_AT_TOP = -90;

type Geometry = {
  readonly radius: number;
  readonly circumference: number;
  readonly dashOffset: number;
};

/**
 * The mock draws this ring with `conic-gradient`, which React Native has no
 * equivalent for. An SVG circle gets there instead: stroke the full
 * circumference, then hide the unearned part with a dash offset.
 */
export const ringGeometry = (
  size: number,
  strokeWidth: number,
  percentage: number | null,
): Geometry => {
  // Stroke is centred on the path, so the radius is inset by half its width.
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled =
    percentage === null ? 0 : Math.min(FULL, Math.max(0, percentage));

  return {
    radius,
    circumference,
    dashOffset: circumference * (1 - filled / FULL),
  };
};

type Props = {
  readonly size: number;
  readonly strokeWidth: number;
  readonly percentage: number | null;
  readonly color?: string;
  readonly children?: ReactNode;
};

export function CompletionRing({
  size,
  strokeWidth,
  percentage,
  color = colors.accent,
  children,
}: Props) {
  const { radius, circumference, dashOffset } = ringGeometry(
    size,
    strokeWidth,
    percentage,
  );
  const centre = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={centre}
          cy={centre}
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          testID={RING_PROGRESS_TEST_ID}
          cx={centre}
          cy={centre}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="butt"
          // A plain SVG transform string rather than the rotation/originX
          // props: those compile to a transform-origin attribute the DOM
          // rejects when the same component renders on web.
          transform={`rotate(${START_AT_TOP} ${centre} ${centre})`}
        />
      </Svg>
      <View style={styles.centre} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
