import { fireEvent, render, screen } from "@testing-library/react-native";

import { ProfileHeader } from "./ProfileHeader";

const PROFILE = {
  steamId: "76561197979269357",
  personaName: "Caribou",
  avatarUrl: "https://avatars.steamstatic.com/x_full.jpg",
  profileUrl: "https://steamcommunity.com/id/caribou/",
} as const;

describe("ProfileHeader", () => {
  it("shows who is being looked at and how much they own", () => {
    render(<ProfileHeader profile={PROFILE} gameCount={367} onChangeProfile={jest.fn()} />);

    expect(screen.getByText("Caribou")).toBeTruthy();
    expect(screen.getByText("367 games")).toBeTruthy();
  });

  it("offers a way to look at somebody else", () => {
    const onChangeProfile = jest.fn();
    render(
      <ProfileHeader profile={PROFILE} gameCount={367} onChangeProfile={onChangeProfile} />,
    );

    fireEvent.press(screen.getByLabelText("Change profile"));

    expect(onChangeProfile).toHaveBeenCalled();
  });
});
