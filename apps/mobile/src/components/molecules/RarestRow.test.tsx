import { render, fireEvent } from "@testing-library/react-native";

import { letTheDeviceAnswer } from "../../accessibility/reduce-motion.test-support";
import type { NamedUnlock } from "../../view-models/rarest-unlocks";
import { SKELETON_TEST_ID } from "../atoms/Skeleton";
import { RarestRow, RAREST_ICON_TEST_ID } from "./RarestRow";

const row = (over: Partial<NamedUnlock> = {}): NamedUnlock => ({
  appId: 2066020,
  gameName: "Soulstone Survivors",
  apiName: "ACH_ASCEND_10",
  rarity: 0.4,
  rarityLabel: "0.4%",
  displayName: "Ascendant",
  icon: "https://media.steampowered.com/ach/ascend.jpg",
  pending: false,
  ...over,
});

describe("RarestRow", () => {
  /**
   * Across a whole library, which game a trophy came from places it; the
   * flavour text the game screen shows does not.
   */
  it("shows the achievement over the game it came from", () => {
    const { getByText, queryByText } = render(
      <RarestRow row={row()} onPress={() => {}} />,
    );

    expect(getByText("Ascendant")).toBeTruthy();
    expect(getByText("Soulstone Survivors")).toBeTruthy();
    expect(queryByText("ACH_ASCEND_10")).toBeNull();
  });

  /**
   * `0.4%` alone would read as a completion rate on a screen full of them, and
   * Rarity reads backwards to every other percentage in this app.
   */
  it("writes the figure with what it is a share of", () => {
    const { getByText } = render(<RarestRow row={row()} onPress={() => {}} />);

    expect(getByText("0.4%")).toBeTruthy();
    expect(getByText("of players")).toBeTruthy();
  });

  it("opens the game the row came from", () => {
    const onPress = jest.fn();
    const { getByText } = render(<RarestRow row={row()} onPress={onPress} />);

    fireEvent.press(getByText("Ascendant"));

    expect(onPress).toHaveBeenCalledWith(2066020);
  });

  /**
   * A row earned its place on a figure Steam published; a game that would not
   * name it takes nothing back. The name falls through to the apiName upstream,
   * and the tile is simply left empty rather than the row being dropped.
   */
  it("draws a row whose game named nothing for it", () => {
    const { getByText, queryByTestId } = render(
      <RarestRow
        row={row({ displayName: "ACH_ASCEND_10", icon: null })}
        onPress={() => {}}
      />,
    );

    expect(getByText("ACH_ASCEND_10")).toBeTruthy();
    expect(getByText("0.4%")).toBeTruthy();
    expect(queryByTestId(RAREST_ICON_TEST_ID)).toBeNull();
  });

  it("draws the icon its game gave it", () => {
    const { getByTestId } = render(<RarestRow row={row()} onPress={() => {}} />);

    expect(getByTestId(RAREST_ICON_TEST_ID)).toBeTruthy();
  });

  /**
   * The window between the ranking and the names. An apiName is a key, and a
   * row wearing one does not read as a row that is waiting — it reads as a game
   * that names its achievements ACH_ASCEND_10.
   */
  it("pulses instead of showing the key it was ranked under", async () => {
    const { getByTestId, queryByText } = render(
      <RarestRow
        row={row({ displayName: "ACH_ASCEND_10", icon: null, pending: true })}
        onPress={() => {}}
      />,
    );
    await letTheDeviceAnswer();

    expect(getByTestId(SKELETON_TEST_ID)).toBeTruthy();
    expect(queryByText("ACH_ASCEND_10")).toBeNull();
  });

  /**
   * The figure is what the row was ranked on and it is already in: only the
   * name is being waited for, so the rest of the row must not flicker.
   */
  it("keeps its figure and its game while it waits", () => {
    const { getByText } = render(
      <RarestRow row={row({ pending: true })} onPress={() => {}} />,
    );

    expect(getByText("0.4%")).toBeTruthy();
    expect(getByText("Soulstone Survivors")).toBeTruthy();
  });

  /** A game that answered without naming the row is finished, not waiting. */
  it("shows no skeleton once its game has answered", () => {
    const { queryByTestId, getByText } = render(
      <RarestRow
        row={row({ displayName: "ACH_ASCEND_10", icon: null })}
        onPress={() => {}}
      />,
    );

    expect(queryByTestId(SKELETON_TEST_ID)).toBeNull();
    expect(getByText("ACH_ASCEND_10")).toBeTruthy();
  });
});
