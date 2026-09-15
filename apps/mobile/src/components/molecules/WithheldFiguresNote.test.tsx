import { render, fireEvent } from "@testing-library/react-native";

import { openExternalUrl } from "./open-external-url";
import { WithheldFiguresNote, STEAM_PRIVACY_URL } from "./WithheldFiguresNote";

jest.mock("./open-external-url", () => ({
  openExternalUrl: jest.fn(() => Promise.resolve()),
}));

const openedUrl = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

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

  /**
   * The link is the way out for whoever can take it, so pressing it never
   * withdraws it. Nothing better can be offered in its place, and the note
   * stands whatever came of the attempt — which is why this asserts the link
   * survives rather than asserting anything about the outcome. Whether opening
   * can fail at all is `openExternalUrl`'s own contract, and pinned there: it
   * resolves either way, so there is no rejection for this to handle.
   */
  it("keeps its link when it has already been pressed", () => {
    const { getByRole } = render(
      <WithheldFiguresNote published={{ playtime: false, lastPlayed: false }} />,
    );

    fireEvent.press(getByRole("link"));
    fireEvent.press(getByRole("link"));

    expect(getByRole("link")).toBeTruthy();
    expect(openedUrl).toHaveBeenCalledTimes(2);
  });

  it("does not tell a reader it is their own profile", () => {
    const { queryByText } = render(
      <WithheldFiguresNote published={{ playtime: false, lastPlayed: false }} />,
    );

    expect(queryByText(/your playtime/)).toBeNull();
    expect(queryByText(/^Make your/)).toBeNull();
  });
});
