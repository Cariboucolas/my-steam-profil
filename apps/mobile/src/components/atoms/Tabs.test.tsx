import { render, fireEvent } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { Tabs } from "./Tabs";

const LABELS = ["Achievements", "Timeline"] as const;

describe("Tabs", () => {
  it("renders every label", () => {
    const { getByText } = render(
      <Tabs labels={LABELS} activeIndex={0} onSelect={() => {}} />,
    );
    LABELS.forEach((label) => expect(getByText(label)).toBeTruthy());
  });

  it("highlights only the active tab", () => {
    const { getByText } = render(
      <Tabs labels={LABELS} activeIndex={1} onSelect={() => {}} />,
    );
    expect(getByText("Timeline").props.style.color).toBe(colors.text);
    expect(getByText("Achievements").props.style.color).toBe(colors.textDim);
  });

  it("reports the index that was pressed", () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <Tabs labels={LABELS} activeIndex={0} onSelect={onSelect} />,
    );
    fireEvent.press(getByText("Timeline"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
