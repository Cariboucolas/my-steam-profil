import { render, fireEvent } from "@testing-library/react-native";
import { openURL } from "expo-linking";

import { WithheldFiguresNote, STEAM_PRIVACY_URL } from "./WithheldFiguresNote";

jest.mock("expo-linking", () => ({ openURL: jest.fn(() => Promise.resolve(true)) }));

const openedUrl = openURL as jest.MockedFunction<typeof openURL>;

beforeEach(() => openedUrl.mockClear());

describe("WithheldFiguresNote", () => {
  /** Nothing is missing, so there is nothing to explain. */
  it("says nothing when Steam publishes both figures", () => {
    const { toJSON } = render(
      <WithheldFiguresNote published={{ playtime: true, lastPlayed: true }} />,
    );

    expect(toJSON()).toBeNull();
  });

  /**
   * The 76561197985221153 case: every hour withheld. Two orders are gone from
   * the chips and every row reads a zero it did not earn, and neither is
   * explained by anything else on the screen.
   */
  it("names the playtime as the figure Steam is not publishing", () => {
    const { getByText } = render(
      <WithheldFiguresNote published={{ playtime: false, lastPlayed: false }} />,
    );

    expect(getByText(/does not publish this profile's playtime/)).toBeTruthy();
  });

  /**
   * The 76561197997989573 case: hours throughout, never a date. Only the
   * recency order is gone, so naming the playtime here would be untrue.
   */
  it("names the last-played time when that alone is withheld", () => {
    const { getByText, queryByText } = render(
      <WithheldFiguresNote published={{ playtime: true, lastPlayed: false }} />,
    );

    expect(getByText(/when this profile last played/)).toBeTruthy();
    expect(queryByText(/this profile's playtime/)).toBeNull();
  });

  /**
   * The app shows any public profile and has no authentication, so whoever is
   * reading may well not own what they are looking at. The line offers rather
   * than instructs, and the way out is one tap for whoever can take it.
   */
  it("opens Steam's privacy settings for a reader who owns the profile", () => {
    const { getByRole } = render(
      <WithheldFiguresNote published={{ playtime: false, lastPlayed: false }} />,
    );

    fireEvent.press(getByRole("link"));

    expect(openedUrl).toHaveBeenCalledWith(STEAM_PRIVACY_URL);
  });

  it("does not tell a reader it is their own profile", () => {
    const { queryByText } = render(
      <WithheldFiguresNote published={{ playtime: false, lastPlayed: false }} />,
    );

    expect(queryByText(/your playtime/)).toBeNull();
    expect(queryByText(/^Make your/)).toBeNull();
  });
});
