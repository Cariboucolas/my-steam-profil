import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SteamIdForm } from "./SteamIdForm";

const STEAM_ID = "76561197979269357";
const FIELD = "SteamID64";

describe("SteamIdForm", () => {
  it("hands over what was typed", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    await render(<SteamIdForm onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText(FIELD), STEAM_ID);
    await fireEvent.press(screen.getByText("Show this profile"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(STEAM_ID));
  });

  it("says so when the value is refused, and keeps it in the field", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
    await render(<SteamIdForm onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText(FIELD), "my-steam-name");
    await fireEvent.press(screen.getByText("Show this profile"));

    // Matched on the error's own opening, not on "seventeen digits" — the hint
    // says that too, and a test that cannot tell them apart proves nothing.
    await waitFor(() => expect(screen.getByText(/that is not a steamid64/i)).toBeTruthy());
    expect(screen.getByLabelText(FIELD).props.value).toBe("my-steam-name");
  });

  it("drops the message as soon as the field is edited again", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(false);
    await render(<SteamIdForm onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText(FIELD), "nope");
    await fireEvent.press(screen.getByText("Show this profile"));
    await waitFor(() => expect(screen.getByText(/that is not a steamid64/i)).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText(FIELD), "7");

    expect(screen.queryByText(/that is not a steamid64/i)).toBeNull();
  });

  it("offers no way out when there is nothing to go back to", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    await render(<SteamIdForm onSubmit={onSubmit} />);

    expect(screen.queryByText("Cancel")).toBeNull();
  });

  it("offers a way out when given one", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const onCancel = jest.fn();
    await render(<SteamIdForm onSubmit={onSubmit} onCancel={onCancel} />);

    await fireEvent.press(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalled();
  });

  it("offers nothing to forget when there is no profile", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    await render(<SteamIdForm onSubmit={onSubmit} onCancel={jest.fn()} />);

    expect(screen.queryByText("Forget this profile")).toBeNull();
  });

  it("forgets the profile when asked to", async () => {
    const onSubmit = jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true);
    const onForget = jest.fn();
    await render(<SteamIdForm onSubmit={onSubmit} onForget={onForget} />);

    await fireEvent.press(screen.getByText("Forget this profile"));

    expect(onForget).toHaveBeenCalled();
  });

  it("stops waiting even when the submit handler rejects", async () => {
    // A rejected submit used to skip setBusy(false) and disable the button
    // for good, with no message.
    const onSubmit = jest
      .fn<Promise<boolean>, [string]>()
      .mockRejectedValue(new Error("storage unavailable"));
    await render(<SteamIdForm onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText(FIELD), "76561197979269357");
    await fireEvent.press(screen.getByText("Show this profile"));

    await waitFor(() => expect(screen.getByText(/that is not a steamid64/i)).toBeTruthy());
    // The control must still respond: press it a second time.
    await fireEvent.press(screen.getByText("Show this profile"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  });
});
