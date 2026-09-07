import { fireEvent, render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import {
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
