import { fireEvent, render } from "@testing-library/react-native";

import { StatsChips } from "./StatsChips";

const CARDS = [
  { key: "years", label: "Years" },
  { key: "week", label: "Week" },
] as const;

describe("StatsChips", () => {
  /** A screen reader hears a row of tabs, and which one is the card in view. */
  it("offers one tab per card, the one in view selected", async () => {
    const { getAllByRole } = await render(
      <StatsChips cards={CARDS} active="week" onSelect={() => {}} />,
    );

    const tabs = getAllByRole("tab");
    expect(tabs.map((tab) => tab.props.accessibilityState?.selected)).toEqual([false, true]);
  });

  it("names the card a pressed chip stands for", async () => {
    const onSelect = jest.fn();
    const { getByText } = await render(
      <StatsChips cards={CARDS} active="years" onSelect={onSelect} />,
    );

    await fireEvent.press(getByText("Week"));
    expect(onSelect).toHaveBeenCalledWith("week");
  });
});
