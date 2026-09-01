import { render, fireEvent } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { SortChips } from "./SortChips";

describe("SortChips", () => {
  it("offers every order the library can be read in", () => {
    const { getByText } = render(
      <SortChips active="completed" onSelect={() => {}} />,
    );

    expect(getByText("Completed first")).toBeTruthy();
    expect(getByText("Recently played")).toBeTruthy();
    expect(getByText("Most played")).toBeTruthy();
  });

  it("marks the order in force and leaves the others muted", () => {
    const { getByText } = render(
      <SortChips active="recent" onSelect={() => {}} />,
    );

    expect(getByText("Recently played").props.style.color).toBe(colors.accent);
    expect(getByText("Most played").props.style.color).toBe(colors.textMuted);
  });

  it("reports the order that was picked", () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <SortChips active="completed" onSelect={onSelect} />,
    );

    fireEvent.press(getByText("Most played"));

    expect(onSelect).toHaveBeenCalledWith("playtime");
  });
});
