import { fireEvent, render, screen } from "@testing-library/react-native";

import { ErrorState } from "./ErrorState";

const MESSAGE = "The backend is unavailable right now. Please wait a moment, then try again.";

describe("ErrorState", () => {
  it("shows the message", async () => {
    await render(<ErrorState message={MESSAGE} onRetry={jest.fn()} />);

    expect(screen.getByText(MESSAGE)).toBeTruthy();
  });

  it("retries on request", async () => {
    const onRetry = jest.fn();
    await render(<ErrorState message={MESSAGE} onRetry={onRetry} />);

    await fireEvent.press(screen.getByLabelText("Try again"));

    expect(onRetry).toHaveBeenCalled();
  });

  it("offers no way to change profile when none is given", async () => {
    await render(<ErrorState message={MESSAGE} onRetry={jest.fn()} />);

    expect(screen.queryByLabelText("Change profile")).toBeNull();
  });

  it("offers a way to change profile when given one", async () => {
    const onChangeProfile = jest.fn();
    await render(
      <ErrorState message={MESSAGE} onRetry={jest.fn()} onChangeProfile={onChangeProfile} />,
    );

    await fireEvent.press(screen.getByLabelText("Change profile"));

    expect(onChangeProfile).toHaveBeenCalled();
  });
});
