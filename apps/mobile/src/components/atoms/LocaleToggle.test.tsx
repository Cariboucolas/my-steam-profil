import { fireEvent, render } from "@testing-library/react-native";

import { LocaleToggle } from "./LocaleToggle";

describe("LocaleToggle", () => {
  it("names each language by its tag", async () => {
    const { getByText } = await render(<LocaleToggle active="en" onSelect={() => {}} />);

    expect(getByText("EN")).toBeTruthy();
    expect(getByText("FR")).toBeTruthy();
  });

  it("marks the language in use", async () => {
    const { getAllByRole } = await render(<LocaleToggle active="fr" onSelect={() => {}} />);

    const [en, fr] = getAllByRole("radio");
    expect(en?.props.accessibilityState).toEqual({ selected: false });
    expect(fr?.props.accessibilityState).toEqual({ selected: true });
  });

  it("says which locale was chosen", async () => {
    const onSelect = jest.fn();
    const { getByText } = await render(<LocaleToggle active="en" onSelect={onSelect} />);

    await fireEvent.press(getByText("FR"));

    expect(onSelect).toHaveBeenCalledWith("fr");
  });
});
