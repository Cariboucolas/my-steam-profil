import { fireEvent, render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("shows its label", async () => {
    const { getByText } = await render(
      <Chip label="Closest to 100%" active={false} onPress={() => {}} />,
    );
    expect(getByText("Closest to 100%")).toBeTruthy();
  });

  it("tints the label with the accent when active", async () => {
    const { getByText } = await render(<Chip label="Unlocked" active onPress={() => {}} />);
    expect(getByText("Unlocked").props.style.color).toBe(colors.accent);
  });

  it("stays muted when inactive", async () => {
    const { getByText } = await render(<Chip label="Unlocked" active={false} onPress={() => {}} />);
    expect(getByText("Unlocked").props.style.color).toBe(colors.textMuted);
  });

  it("reports presses", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Chip label="Locked" active={false} onPress={onPress} />);
    await fireEvent.press(getByText("Locked"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
