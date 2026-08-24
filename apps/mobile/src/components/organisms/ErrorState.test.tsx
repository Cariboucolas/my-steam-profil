import { fireEvent, render, screen } from "@testing-library/react-native";

import { ErrorState } from "./ErrorState";

const MESSAGE = "The backend is unavailable right now. Please wait a moment, then try again.";

describe("ErrorState", () => {
  it("shows the message", () => {
    render(<ErrorState message={MESSAGE} onRetry={jest.fn()} />);

    expect(screen.getByText(MESSAGE)).toBeTruthy();
  });

  it("retries on request", () => {
    const onRetry = jest.fn();
    render(<ErrorState message={MESSAGE} onRetry={onRetry} />);

    fireEvent.press(screen.getByLabelText("Try again"));

    expect(onRetry).toHaveBeenCalled();
  });

  it("offers no way to change profile when none is given", () => {
    render(<ErrorState message={MESSAGE} onRetry={jest.fn()} />);

    expect(screen.queryByLabelText("Change profile")).toBeNull();
  });

  it("offers a way to change profile when given one", () => {
    const onChangeProfile = jest.fn();
    render(
      <ErrorState message={MESSAGE} onRetry={jest.fn()} onChangeProfile={onChangeProfile} />,
    );

    fireEvent.press(screen.getByLabelText("Change profile"));

    expect(onChangeProfile).toHaveBeenCalled();
  });
});
