import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SteamIdForm } from "./SteamIdForm";

const STEAM_ID = "76561197979269357";
const FIELD = "SteamID64";

describe("SteamIdForm", () => {
  it("hands over what was typed", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    render(<SteamIdForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText(FIELD), STEAM_ID);
    fireEvent.press(screen.getByText("Show this profile"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(STEAM_ID));
  });

  it("says so when the value is refused, and keeps it in the field", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
    render(<SteamIdForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText(FIELD), "my-steam-name");
    fireEvent.press(screen.getByText("Show this profile"));

    // Matched on the error's own opening, not on "seventeen digits" — the hint
    // says that too, and a test that cannot tell them apart proves nothing.
    await waitFor(() => expect(screen.getByText(/that is not a steamid64/i)).toBeTruthy());
    expect(screen.getByLabelText(FIELD).props.value).toBe("my-steam-name");
  });

  it("drops the message as soon as the field is edited again", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
    render(<SteamIdForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText(FIELD), "nope");
    fireEvent.press(screen.getByText("Show this profile"));
    await waitFor(() => expect(screen.getByText(/that is not a steamid64/i)).toBeTruthy());

    fireEvent.changeText(screen.getByLabelText(FIELD), "7");

    expect(screen.queryByText(/that is not a steamid64/i)).toBeNull();
  });

  it("offers no way out when there is nothing to go back to", () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    render(<SteamIdForm onSubmit={onSubmit} />);

    expect(screen.queryByText("Cancel")).toBeNull();
  });

  it("offers a way out when given one", () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const onCancel = jest.fn();
    render(<SteamIdForm onSubmit={onSubmit} onCancel={onCancel} />);

    fireEvent.press(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalled();
  });
});
