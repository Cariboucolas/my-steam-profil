import { render, fireEvent } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { SortChips } from "./SortChips";

/** A library Steam publishes both figures for: every order is available. */
const PUBLISHED = { playtime: true, lastPlayed: true } as const;

describe("SortChips", () => {
  it("offers every order the library can be read in", () => {
    const { getByText } = render(
      <SortChips active="completed" onSelect={() => {}} published={PUBLISHED} />,
    );

    expect(getByText("Completed first")).toBeTruthy();
    expect(getByText("Recently played")).toBeTruthy();
    expect(getByText("Most played")).toBeTruthy();
  });

  /**
   * An order over a figure Steam withholds cannot be produced: every key is
   * equal, so the sort is stable and hands back Steam's own arbitrary order
   * while the chip sits there looking selected. Measured on 76561197985221153,
   * where all 100 games carry neither figure — both chips there ordered
   * nothing, and identically.
   */
  it("offers no order over a figure Steam withholds", () => {
    const { getByText, queryByText } = render(
      <SortChips
        active="completed"
        onSelect={() => {}}
        published={{ playtime: false, lastPlayed: false }}
      />,
    );

    expect(getByText("Completed first")).toBeTruthy();
    expect(queryByText("Recently played")).toBeNull();
    expect(queryByText("Most played")).toBeNull();
  });

  /**
   * The two figures do not fall together. On 76561197997989573, 82 of 101 games
   * carry playtime and not one carries a date, so that library can be ordered
   * by hours and not by recency.
   */
  it("keeps the order it can still produce when only the dates are withheld", () => {
    const { getByText, queryByText } = render(
      <SortChips
        active="completed"
        onSelect={() => {}}
        published={{ playtime: true, lastPlayed: false }}
      />,
    );

    expect(getByText("Most played")).toBeTruthy();
    expect(queryByText("Recently played")).toBeNull();
  });

  it("marks the order in force and leaves the others muted", () => {
    const { getByText } = render(
      <SortChips active="recent" onSelect={() => {}} published={PUBLISHED} />,
    );

    expect(getByText("Recently played").props.style.color).toBe(colors.accent);
    expect(getByText("Most played").props.style.color).toBe(colors.textMuted);
  });

  it("reports the order that was picked", () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <SortChips active="completed" onSelect={onSelect} published={PUBLISHED} />,
    );

    fireEvent.press(getByText("Most played"));

    expect(onSelect).toHaveBeenCalledWith("playtime");
  });
});
