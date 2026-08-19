import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  CompletionRing,
  RING_PROGRESS_TEST_ID,
  ringGeometry,
} from "./CompletionRing";

describe("ringGeometry", () => {
  const SIZE = 88;
  const STROKE = 7;
  // The arc is stroked along the mid-line of the ring, not its outer edge.
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  it("strokes the whole circle at 100 %", () => {
    expect(ringGeometry(SIZE, STROKE, 100).dashOffset).toBeCloseTo(0);
  });

  it("strokes nothing at 0 %", () => {
    expect(ringGeometry(SIZE, STROKE, 0).dashOffset).toBeCloseTo(circumference);
  });

  it("leaves a proportional gap partway round", () => {
    expect(ringGeometry(SIZE, STROKE, 73).dashOffset).toBeCloseTo(
      circumference * 0.27,
    );
  });

  it("clamps a percentage that falls outside 0-100", () => {
    expect(ringGeometry(SIZE, STROKE, 140).dashOffset).toBeCloseTo(0);
    expect(ringGeometry(SIZE, STROKE, -3).dashOffset).toBeCloseTo(circumference);
  });

  it("treats unknown completion as an empty ring", () => {
    expect(ringGeometry(SIZE, STROKE, null).dashOffset).toBeCloseTo(
      circumference,
    );
  });
});

describe("CompletionRing", () => {
  it("renders whatever sits at its centre", () => {
    const { getByText } = render(
      <CompletionRing size={88} strokeWidth={7} percentage={73}>
        <Text>73%</Text>
      </CompletionRing>,
    );
    expect(getByText("73%")).toBeTruthy();
  });

  it("exposes the progress arc", () => {
    const { getByTestId } = render(
      <CompletionRing size={88} strokeWidth={7} percentage={73} />,
    );
    expect(getByTestId(RING_PROGRESS_TEST_ID)).toBeTruthy();
  });
});
