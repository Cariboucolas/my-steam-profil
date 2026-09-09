import { render, fireEvent } from "@testing-library/react-native";

import type { NamedUnlock } from "../../view-models/rarest-unlocks";
import { RarestRow, RAREST_ICON_TEST_ID } from "./RarestRow";

const row = (over: Partial<NamedUnlock> = {}): NamedUnlock => ({
  appId: 2066020,
  gameName: "Soulstone Survivors",
  apiName: "ACH_ASCEND_10",
  rarity: 0.4,
  rarityLabel: "0.4%",
  displayName: "Ascendant",
  icon: "https://media.steampowered.com/ach/ascend.jpg",
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
});
