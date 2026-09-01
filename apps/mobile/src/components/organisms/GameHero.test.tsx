import { render, fireEvent } from "@testing-library/react-native";

import { spacing } from "../../theme/tokens";
import { GameHero } from "./GameHero";

const hero = (onBack = () => {}) => (
  <GameHero
    appId={2066020}
    name="Soulstone Survivors"
    meta="353/483 · 83 h"
    topInset={47}
    onBack={onBack}
  />
);

describe("GameHero", () => {
  it("shows the game it heads", () => {
    const { getByText } = render(hero());

    expect(getByText("Soulstone Survivors")).toBeTruthy();
    expect(getByText("353/483 · 83 h")).toBeTruthy();
  });

  it("goes back when asked", () => {
    const onBack = jest.fn();
    const { getByLabelText } = render(hero(onBack));

    fireEvent.press(getByLabelText("Back to library"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  /**
   * The chevron sits over the cover art, where the status bar also is. It is
   * pushed down by whatever the platform reports rather than by a guess.
   */
  it("clears the status bar the platform reports", () => {
    const { getByLabelText } = render(hero());

    expect(getByLabelText("Back to library")).toHaveStyle({ top: 47 + spacing.sm });
  });
});
