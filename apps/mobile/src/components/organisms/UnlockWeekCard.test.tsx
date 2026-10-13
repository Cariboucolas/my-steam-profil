import { render, screen } from "@testing-library/react-native";

import { deviceAsksForLessMotion } from "../../accessibility/reduce-motion.test-support";
import { translatorFor } from "../../i18n/i18n";
import type { CountedUnlocks } from "../../view-models/unlock-days";
import { buildUnlockWeek } from "../../view-models/unlock-week";
import { HOUR_BAR_TEST_ID } from "../molecules/HourBars";
import { RECORD_FIGURE_SKELETON_TEST_ID } from "../molecules/RecordFigure";
import { UnlockWeekCard, WEEK_CARD_TEST_ID } from "./UnlockWeekCard";

const english = translatorFor("en");
const SATURDAY_9PM = new Date(2026, 3, 18, 21, 30).getTime() / 1000;
const VIEW: CountedUnlocks = {
  games: [
    {
      appId: 1,
      name: "Game 1",
      playtimeMinutes: 60,
      iconUrl: "https://icon/1.jpg",
      lastPlayedAt: null,
    },
  ],
  tallies: {
    1: {
      completion: { unlocked: 1, total: 10, percentage: 10 },
      unlocks: [{ apiName: "ACH", at: SATURDAY_9PM }],
    },
  },
};
const weekOf = (counted: boolean, view = VIEW) =>
  buildUnlockWeek(view, counted, "en", english, null);

describe("UnlockWeekCard", () => {
  beforeEach(deviceAsksForLessMotion);

  it("names the busiest slot, draws the week, and states the three shares", () => {
    render(<UnlockWeekCard week={weekOf(true)} loaded={null} />);

    expect(screen.getByTestId(WEEK_CARD_TEST_ID)).toBeTruthy();
    expect(screen.getByText("Sat 9 pm")).toBeTruthy();
    expect(screen.getByText("busiest slot")).toBeTruthy();
    expect(screen.getAllByTestId(HOUR_BAR_TEST_ID)).toHaveLength(24);
    expect(screen.getByLabelText(/^Busiest slot: Saturday 9 pm/)).toBeTruthy();
    expect(screen.getByLabelText("between 6 pm and midnight: 100%")).toBeTruthy();
    expect(screen.queryAllByTestId(RECORD_FIGURE_SKELETON_TEST_ID)).toHaveLength(0);
  });

  it("draws the week while counting, but neither the slot nor the shares", () => {
    render(<UnlockWeekCard week={weekOf(false)} loaded={0.4} />);

    expect(screen.getAllByTestId(HOUR_BAR_TEST_ID)).toHaveLength(24);
    expect(screen.queryByText("Sat 9 pm")).toBeNull();
    expect(screen.getAllByTestId(RECORD_FIGURE_SKELETON_TEST_ID)).toHaveLength(3);
  });

  it("holds the chart's place while nothing dated has landed", () => {
    render(<UnlockWeekCard week={{ kind: "waiting" }} loaded={0.1} />);

    expect(screen.queryAllByTestId(HOUR_BAR_TEST_ID)).toHaveLength(0);
    expect(screen.getAllByTestId(RECORD_FIGURE_SKELETON_TEST_ID)).toHaveLength(3);
  });

  it("says so when nothing was dated", () => {
    render(<UnlockWeekCard week={{ kind: "empty" }} loaded={null} />);

    expect(screen.getByText("No dated unlocks")).toBeTruthy();
    expect(screen.queryAllByTestId(RECORD_FIGURE_SKELETON_TEST_ID)).toHaveLength(0);
  });
});
