import { render } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { CompletionRing, RING_PROGRESS_TEST_ID, ringGeometry } from "./CompletionRing";

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
    expect(ringGeometry(SIZE, STROKE, 73).dashOffset).toBeCloseTo(circumference * 0.27);
  });

  it("clamps a percentage that falls outside 0-100", () => {
    expect(ringGeometry(SIZE, STROKE, 140).dashOffset).toBeCloseTo(0);
    expect(ringGeometry(SIZE, STROKE, -3).dashOffset).toBeCloseTo(circumference);
  });

  it("treats unknown completion as an empty ring", () => {
    expect(ringGeometry(SIZE, STROKE, null).dashOffset).toBeCloseTo(circumference);
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

  // By style rather than by prop, which react-native-web reports as deprecated.
  it("lets touches through its centre to whatever holds the ring", () => {
    const { getByText } = render(
      <CompletionRing size={88} strokeWidth={7} percentage={73}>
        <Text>73%</Text>
      </CompletionRing>,
    );
    const centre = getByText("73%").parent?.parent;

    expect(centre?.props.pointerEvents).toBeUndefined();
    expect(StyleSheet.flatten(centre?.props.style)).toEqual(
      expect.objectContaining({ pointerEvents: "none" }),
    );
  });

  it("exposes the progress arc", () => {
    const { getByTestId } = render(<CompletionRing size={88} strokeWidth={7} percentage={73} />);
    expect(getByTestId(RING_PROGRESS_TEST_ID)).toBeTruthy();
  });
});
