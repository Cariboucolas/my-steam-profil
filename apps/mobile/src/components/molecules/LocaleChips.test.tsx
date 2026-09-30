import { fireEvent, render } from "@testing-library/react-native";

import { LocaleChips } from "./LocaleChips";

describe("LocaleChips", () => {
  it("names each language in itself", () => {
    const { getByText } = render(<LocaleChips active="en" onSelect={() => {}} />);

    expect(getByText("English")).toBeTruthy();
    expect(getByText("Français")).toBeTruthy();
  });

  it("marks the language in use", () => {
    const { getByText } = render(<LocaleChips active="fr" onSelect={() => {}} />);

    expect(getByText("Français").parent?.parent?.props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it("says which locale was chosen", () => {
    const onSelect = jest.fn();
    const { getByText } = render(<LocaleChips active="en" onSelect={onSelect} />);

    fireEvent.press(getByText("Français"));

    expect(onSelect).toHaveBeenCalledWith("fr");
  });
});
