import { render } from "@testing-library/react-native";

import { RarestEmpty } from "./RarestEmpty";

describe("RarestEmpty", () => {
  /**
   * The count is where the games holding an unlock come from, so the tab waits
   * on it — and a wait nobody explained looks exactly like an answer.
   */
  it("says the library is being counted first", () => {
    const { getByText } = render(
      <RarestEmpty status="counting" anyUnlock={false} />,
    );

    expect(getByText("Counting your library first")).toBeTruthy();
  });

  it("says the figures are still landing", () => {
    const { getByText } = render(
      <RarestEmpty status="loading" anyUnlock={true} />,
    );

    expect(getByText("Ranking what you have unlocked")).toBeTruthy();
  });

  it("tells a player who has unlocked nothing anywhere that they have", () => {
    const { getByText } = render(
      <RarestEmpty status="ready" anyUnlock={false} />,
    );

    expect(getByText("Nothing unlocked in any game yet")).toBeTruthy();
  });

  /**
   * The player holding trophies Steam publishes no figure for has unlocked
   * plenty. Handing them the other sentence would be a plain untruth.
   */
  it("does not tell a player with unlocks that they have none", () => {
    const { getByText, queryByText } = render(
      <RarestEmpty status="ready" anyUnlock={true} />,
    );

    expect(getByText("Nothing here Steam publishes a figure for")).toBeTruthy();
    expect(queryByText("Nothing unlocked in any game yet")).toBeNull();
  });

  /** A tab nobody has opened has nothing to say about a tab nobody opened. */
  it("says nothing at all before the tab has been opened", () => {
    const { toJSON } = render(<RarestEmpty status="idle" anyUnlock={false} />);

    expect(toJSON()).toBeNull();
  });
});
