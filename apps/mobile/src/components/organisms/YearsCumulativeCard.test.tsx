import { render, screen } from "@testing-library/react-native";

import { deviceAsksForLessMotion } from "../../accessibility/reduce-motion.test-support";
import type { YearsAndCumulative } from "../../view-models/years-and-cumulative";
import { RECORD_FIGURE_SKELETON_TEST_ID } from "../molecules/RecordFigure";
import { YearsCumulativeCard } from "./YearsCumulativeCard";

const drawn = (records: boolean): YearsAndCumulative => ({
  kind: "drawn",
  total: "3 912",
  span: "dated unlocks · 2014 → 2026",
  bars: [{ year: 2026, label: "’26", figure: "688", share: 1, current: true }],
  cumulative: null,
  records: records
    ? {
        bestMonth: { value: "312", label: "best month", when: "Jun 2025" },
        bestDay: { value: "45", label: "best day", when: "20 Jun 2025" },
        longestStreak: { value: "9 days", label: "longest streak", when: "Nov 2025" },
      }
    : null,
  screenReaderLabel: "2014 to 2026: 3 912 dated unlocks",
});

describe("YearsCumulativeCard", () => {
  beforeEach(deviceAsksForLessMotion);

  it("draws the total, the chart and the records", () => {
    render(<YearsCumulativeCard years={drawn(true)} />);
    expect(screen.getByText("3 912")).toBeTruthy();
    expect(screen.getByLabelText("2014 to 2026: 3 912 dated unlocks")).toBeTruthy();
    expect(screen.getByLabelText("longest streak, Nov 2025: 9 days")).toBeTruthy();
  });

  it("holds three skeletons where the records will be", () => {
    render(<YearsCumulativeCard years={drawn(false)} />);
    expect(screen.getAllByTestId(RECORD_FIGURE_SKELETON_TEST_ID)).toHaveLength(3);
  });

  it("says it has no dated unlock", () => {
    render(<YearsCumulativeCard years={{ kind: "empty" }} />);
    expect(screen.getByText("No dated unlocks")).toBeTruthy();
  });

  it("waits as a skeleton before the first dated unlock lands", () => {
    render(<YearsCumulativeCard years={{ kind: "waiting" }} />);
    expect(screen.getAllByTestId(RECORD_FIGURE_SKELETON_TEST_ID)).toHaveLength(3);
    expect(screen.queryByText("No dated unlocks")).toBeNull();
  });
});
