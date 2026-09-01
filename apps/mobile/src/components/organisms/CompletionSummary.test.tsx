import { render } from "@testing-library/react-native";

import type { GameSummary } from "../../view-models/game-progress";
import { CompletionSummary } from "./CompletionSummary";

const summary = (over: Partial<GameSummary> = {}): GameSummary => ({
  percentage: 73,
  rateLabel: "73%",
  fraction: "353 / 483",
  remaining: "130 to go",
  lastUnlock: "Last on 25 Jun 2026",
  meta: "353/483 · 83 h",
  ...over,
});

describe("CompletionSummary", () => {
  it("shows how far the game has got", () => {
    const { getByText } = render(<CompletionSummary summary={summary()} />);

    expect(getByText("73%")).toBeTruthy();
    expect(getByText("353 / 483")).toBeTruthy();
  });

  it("adds what is left and when the last one landed", () => {
    const { getByText } = render(<CompletionSummary summary={summary()} />);

    expect(getByText("130 to go")).toBeTruthy();
    expect(getByText("Last on 25 Jun 2026")).toBeTruthy();
  });

  /**
   * A game with every achievement has nothing left to go, and one with none has
   * no last unlock. The view model hands those over as empty strings, and an
   * empty line would leave a gap the mock does not have.
   */
  it("keeps quiet about what it was not told", () => {
    const { queryByText } = render(
      <CompletionSummary summary={summary({ remaining: "", lastUnlock: "" })} />,
    );

    expect(queryByText("130 to go")).toBeNull();
    expect(queryByText("Last on 25 Jun 2026")).toBeNull();
    expect(queryByText("")).toBeNull();
  });
});
