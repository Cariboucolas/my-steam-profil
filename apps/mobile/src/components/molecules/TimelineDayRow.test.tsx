import { render } from "@testing-library/react-native";

import type { TimelineDay } from "../../view-models/game-progress";
import { TimelineDayRow } from "./TimelineDayRow";

const day = (over: Partial<TimelineDay> = {}): TimelineDay => ({
  key: "2026-06-25",
  day: "25 Jun",
  year: "2026",
  countLabel: "2 unlocked",
  items: [
    {
      apiName: "SURVIVE_10_WAVES",
      name: "Survive 10 waves",
      iconUrl: "https://example.invalid/waves.jpg",
      timeLabel: "21:04",
    },
    {
      apiName: "SLAY_THE_WARDEN",
      name: "Slay the Warden",
      iconUrl: "https://example.invalid/warden.jpg",
      timeLabel: "22:37",
    },
  ],
  ...over,
});

describe("TimelineDayRow", () => {
  it("shows the day it gathers and how much landed on it", () => {
    const { getByText } = render(<TimelineDayRow day={day()} />);

    expect(getByText("25 Jun")).toBeTruthy();
    expect(getByText("2026")).toBeTruthy();
    expect(getByText("2 unlocked")).toBeTruthy();
  });

  it("carries an entry for every achievement of that day", () => {
    const { getByText } = render(<TimelineDayRow day={day()} />);

    expect(getByText("Survive 10 waves")).toBeTruthy();
    expect(getByText("21:04")).toBeTruthy();
    expect(getByText("Slay the Warden")).toBeTruthy();
    expect(getByText("22:37")).toBeTruthy();
  });
});
