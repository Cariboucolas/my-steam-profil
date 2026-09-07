import { fireEvent, render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import {
  HALF_DOT_TARGET,
  UnlockHalfDots,
  UNLOCK_HALF_DOT_TEST_ID,
} from "./UnlockHalfDots";

describe("UnlockHalfDots", () => {
  it("shows one dot per half of the year", () => {
    const { getAllByTestId } = render(
      <UnlockHalfDots inView={0} onSelect={jest.fn()} />,
    );

    expect(getAllByTestId(UNLOCK_HALF_DOT_TEST_ID)).toHaveLength(2);
  });

  it("picks out the half the reader is looking at", () => {
    const { getAllByTestId } = render(
      <UnlockHalfDots inView={1} onSelect={jest.fn()} />,
    );
    const painted = getAllByTestId(UNLOCK_HALF_DOT_TEST_ID).map(
      (dot) => dot.props.style.backgroundColor,
    );

    expect(painted).toEqual([colors.textFaint, colors.accent]);
  });

  it("asks for the half it was pressed on", () => {
    const onSelect = jest.fn();
    const { getAllByTestId } = render(
      <UnlockHalfDots inView={0} onSelect={onSelect} />,
    );

    fireEvent.press(getAllByTestId(UNLOCK_HALF_DOT_TEST_ID)[1]!);

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  /**
   * The control this replaces was a grey bar at the edge of the grid that no
   * pointer could grab: something that looked operable and was not. These are
   * named, they say which one is current, and they carry a pointer's cursor —
   * a mouse reaches them as a finger does.
   */
  it("offers a named target a pointer can take as well as a finger", () => {
    const { getAllByRole, getByLabelText } = render(
      <UnlockHalfDots inView={1} onSelect={jest.fn()} />,
    );
    const dots = getAllByRole("button");

    expect(dots.map((dot) => dot.props.accessibilityState.selected)).toEqual([
      false,
      true,
    ]);
    expect(getByLabelText("First half of the year")).toBeTruthy();
    expect(getByLabelText("Second half of the year")).toBeTruthy();
    expect(dots[0]?.props.style.cursor).toBe("pointer");
  });
});

/**
 * The dots are the whole of the pointer's way through this card, so the size
 * of what it aims at is part of whether the control exists at all. Twenty-four
 * pixels is the smallest target a pointer should be given (WCAG 2.5.8), and
 * the padded box has to meet it on its own: the slop around it is native-only.
 */
describe("HALF_DOT_TARGET", () => {
  it("gives a pointer at least twenty-four pixels to aim at", () => {
    expect(HALF_DOT_TARGET).toBeGreaterThanOrEqual(24);
  });
});
