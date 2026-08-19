import { render, fireEvent } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("shows its label", () => {
    const { getByText } = render(
      <Chip label="Closest to 100%" active={false} onPress={() => {}} />,
    );
    expect(getByText("Closest to 100%")).toBeTruthy();
  });

  it("tints the label with the accent when active", () => {
    const { getByText } = render(
      <Chip label="Unlocked" active onPress={() => {}} />,
    );
    expect(getByText("Unlocked").props.style.color).toBe(colors.accent);
  });

  it("stays muted when inactive", () => {
    const { getByText } = render(
      <Chip label="Unlocked" active={false} onPress={() => {}} />,
    );
    expect(getByText("Unlocked").props.style.color).toBe(colors.textMuted);
  });

  it("reports presses", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Chip label="Locked" active={false} onPress={onPress} />,
    );
    fireEvent.press(getByText("Locked"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
