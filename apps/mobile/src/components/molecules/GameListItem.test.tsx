import { render, fireEvent } from "@testing-library/react-native";

import {
  deviceAsksForLessMotion,
  deviceIsFineWithMotion,
  letTheDeviceAnswer,
} from "../../accessibility/reduce-motion.test-support";
import type { GameRow } from "../../view-models/library";
import { SKELETON_TEST_ID } from "../atoms/Skeleton";
import { GameListItem } from "./GameListItem";

const row = (over: Partial<GameRow> = {}): GameRow => ({
  appId: 2066020,
  name: "Soulstone Survivors",
  percentage: 73,
  rateLabel: "73%",
  meta: "353/483 · 83 h · 25 Jun 2026",
  pending: false,
  ...over,
});

beforeEach(() => {
  deviceIsFineWithMotion();
});

describe("GameListItem", () => {
  it("shows the game and how far the player has got", () => {
    const { getByText } = render(<GameListItem row={row()} onPress={() => {}} />);

    expect(getByText("Soulstone Survivors")).toBeTruthy();
    expect(getByText("73%")).toBeTruthy();
  });

  it("opens the game it was pressed on", () => {
    const onPress = jest.fn();
    const { getByText } = render(<GameListItem row={row()} onPress={onPress} />);

    fireEvent.press(getByText("Soulstone Survivors"));

    expect(onPress).toHaveBeenCalledWith(2066020);
  });

  /**
   * The three states a row can be in have to look like three states. A dash
   * already means "nothing to earn here", so a row still being counted cannot
   * borrow it.
   */
  it("shows a skeleton, not a dash, while its tally is on its way", async () => {
    const { getByTestId, queryByText } = render(
      <GameListItem
        row={row({ percentage: null, rateLabel: "—", pending: true })}
        onPress={() => {}}
      />,
    );
    await letTheDeviceAnswer();

    expect(getByTestId(SKELETON_TEST_ID)).toBeTruthy();
    expect(queryByText("—")).toBeNull();
  });

  it("shows a dash once nothing is coming for it", () => {
    const { getByText, queryByTestId } = render(
      <GameListItem
        row={row({ percentage: null, rateLabel: "—", pending: false })}
        onPress={() => {}}
      />,
    );

    expect(getByText("—")).toBeTruthy();
    expect(queryByTestId(SKELETON_TEST_ID)).toBeNull();
  });

  it("shows no skeleton once the tally has landed", () => {
    const { queryByTestId } = render(<GameListItem row={row()} onPress={() => {}} />);

    expect(queryByTestId(SKELETON_TEST_ID)).toBeNull();
  });

  /**
   * Turning off the pulse must not cost the distinction it was carrying: with
   * less motion asked for, a row on its way is still a block and still not a
   * dash.
   */
  it("shows a skeleton, not a dash, with less motion asked for", async () => {
    deviceAsksForLessMotion();

    const { getByTestId, queryByText } = render(
      <GameListItem
        row={row({ percentage: null, rateLabel: "—", pending: true })}
        onPress={() => {}}
      />,
    );

    await letTheDeviceAnswer();

    expect(getByTestId(SKELETON_TEST_ID)).toBeTruthy();
    expect(queryByText("—")).toBeNull();
  });
});
