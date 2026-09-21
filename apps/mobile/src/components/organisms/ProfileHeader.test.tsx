import { fireEvent, render, screen } from "@testing-library/react-native";

import { PROFILE_REVISION_TEST_ID, ProfileHeader } from "./ProfileHeader";

// The revision is kept out of the traversal, and the queries leave hidden
// elements out by default: asking for it means asking to be shown the paint.
const PAINTED = { includeHiddenElements: true } as const;

const PROFILE = {
  steamId: "76561197979269357",
  personaName: "Caribou",
  avatarUrl: "https://avatars.steamstatic.com/x_full.jpg",
  profileUrl: "https://steamcommunity.com/id/caribou/",
} as const;

describe("ProfileHeader", () => {
  it("shows who is being looked at and how much they own", () => {
    render(
      <ProfileHeader
        profile={PROFILE}
        gameCount={367}
        revision="dev"
        onChangeProfile={jest.fn()}
      />,
    );

    expect(screen.getByText("Caribou")).toBeTruthy();
    expect(screen.getByText("367 games")).toBeTruthy();
  });

  it("states the revision the bundle was built from, beside the count", () => {
    render(
      <ProfileHeader
        profile={PROFILE}
        gameCount={367}
        revision="a1b2c3d"
        onChangeProfile={jest.fn()}
      />,
    );

    expect(screen.getByText("· revision a1b2c3d", PAINTED)).toBeTruthy();
  });

  it("does not let the revision be dragged out with a selection", () => {
    render(
      <ProfileHeader
        profile={PROFILE}
        gameCount={367}
        revision="a1b2c3d"
        onChangeProfile={jest.fn()}
      />,
    );

    expect(screen.getByTestId(PROFILE_REVISION_TEST_ID, PAINTED).props.selectable).toBe(
      false,
    );
  });

  it("keeps the revision out of the traversal, on every platform", () => {
    // Provenance for whoever is looking at the screen, and noise for whoever
    // is listening to it: the header is read as a name, a count and a way out.
    // `accessible` is only `focusable` on Android, and neither native word
    // reaches the DOM, so all three are said — the web build is the one #106
    // was about.
    render(
      <ProfileHeader
        profile={PROFILE}
        gameCount={367}
        revision="a1b2c3d"
        onChangeProfile={jest.fn()}
      />,
    );

    const { props } = screen.getByTestId(PROFILE_REVISION_TEST_ID, PAINTED);

    expect(props["aria-hidden"]).toBe(true);
    expect(props.accessibilityElementsHidden).toBe(true);
    expect(props.importantForAccessibility).toBe("no-hide-descendants");
    expect(screen.queryByText("· revision a1b2c3d")).toBeNull();
  });

  it("offers a way to look at somebody else", () => {
    const onChangeProfile = jest.fn();
    render(
      <ProfileHeader
        profile={PROFILE}
        gameCount={367}
        revision="dev"
        onChangeProfile={onChangeProfile}
      />,
    );

    fireEvent.press(screen.getByLabelText("Change profile"));

    expect(onChangeProfile).toHaveBeenCalled();
  });
});
