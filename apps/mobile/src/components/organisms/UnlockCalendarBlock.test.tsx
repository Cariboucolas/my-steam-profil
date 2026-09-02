import type { GameTallyDto } from "@steam/contracts";
import { fireEvent, render } from "@testing-library/react-native";

import type { TallyByAppId } from "../../view-models/library";
import { describeDay, EMPTY_WINDOW } from "../../view-models/unlock-calendar";
import {
  UnlockCalendarBlock,
  UNLOCK_CALENDAR_CONTROLS_TEST_ID,
} from "./UnlockCalendarBlock";

const DAY_MS = 86_400_000;
const MS_PER_SECOND = 1000;

/** Midnight, that many days back, where the device is. */
const dayStart = (daysBack: number): number => {
  const date = new Date(Date.now() - daysBack * DAY_MS);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const unlockedOn = (daysBack: number): number =>
  Math.floor((dayStart(daysBack) + DAY_MS / 2) / MS_PER_SECOND);

/** A library that unlocked this many achievements that many days ago. */
const libraryUnlocking = (
  perDay: Readonly<Record<number, number>>,
): TallyByAppId => {
  const unlockedAt = Object.entries(perDay).flatMap(([daysBack, count]) =>
    Array.from({ length: count }, () => unlockedOn(Number(daysBack))),
  );
  const tally: GameTallyDto = {
    completion: { unlocked: unlockedAt.length, total: 100, percentage: 1 },
    unlockedAt: [...unlockedAt].sort((a, b) => a - b),
  };
  return { 2066020: tally };
};

/** Nothing asked for yet: no game has been counted, one way or the other. */
const NOTHING_COUNTED: TallyByAppId = {};

/** Counted, and holding nothing a twelve-month window would draw. */
const COUNTED_AND_QUIET = libraryUnlocking({ 900: 3 });

/** The label the cell for that day carries, and what a tap should write. */
const labelFor = (daysBack: number, count: number): string =>
  describeDay({ at: dayStart(daysBack), count, step: 0 });

describe("UnlockCalendarBlock", () => {
  it("names the rendering, and lets the counter carry the duration", () => {
    const { getByText } = render(
      <UnlockCalendarBlock tallies={libraryUnlocking({ 3: 5, 0: 2 })} loaded={null} />,
    );

    expect(getByText("UNLOCKS PER DAY")).toBeTruthy();
    expect(getByText("7 in 12 months")).toBeTruthy();
  });

  /**
   * One rule for the whole block: while a load is running it draws shapes, not
   * figures. The cells appear and darken as the waves land, which says on its
   * own that there is more to come; a climbing number does not.
   */
  it("writes no figure while tallies are still outstanding", () => {
    const { queryByText } = render(
      <UnlockCalendarBlock tallies={libraryUnlocking({ 3: 5 })} loaded={0.4} />,
    );

    expect(queryByText("5 in 12 months")).toBeNull();
    expect(queryByText(EMPTY_WINDOW)).toBeNull();
  });

  it("goes on drawing its days while the tallies land", () => {
    const { getAllByRole } = render(
      <UnlockCalendarBlock tallies={libraryUnlocking({ 3: 5 })} loaded={0.4} />,
    );

    // Three chips, and a year of days behind them.
    expect(getAllByRole("button").length).toBeGreaterThan(300);
  });

  it("says a finished window is empty rather than leaving a blank", () => {
    const { getByText } = render(
      <UnlockCalendarBlock tallies={COUNTED_AND_QUIET} loaded={null} />,
    );

    expect(getByText(EMPTY_WINDOW)).toBeTruthy();
  });

  /**
   * Not the same silence. A library nothing has been counted for cannot say
   * its window is empty — on the paint where a library first appears no wave
   * has left yet, and that sentence would be a claim nobody has checked.
   */
  it("claims nothing about a window it has counted nothing for", () => {
    const { queryByText } = render(
      <UnlockCalendarBlock tallies={NOTHING_COUNTED} loaded={null} />,
    );

    expect(queryByText(EMPTY_WINDOW)).toBeNull();
  });

  it("puts the day a reader taps where the counter was", () => {
    const { getByLabelText, getByText, queryByText } = render(
      <UnlockCalendarBlock tallies={libraryUnlocking({ 3: 5 })} loaded={null} />,
    );

    fireEvent.press(getByLabelText(labelFor(3, 5)));

    expect(getByText(labelFor(3, 5))).toBeTruthy();
    expect(queryByText("5 in 12 months")).toBeNull();
  });

  it("draws less of the year on a shorter duration", () => {
    const { getAllByRole, getByText } = render(
      <UnlockCalendarBlock tallies={COUNTED_AND_QUIET} loaded={null} />,
    );
    const wholeYear = getAllByRole("button").length;

    fireEvent.press(getByText("3m"));

    expect(getAllByRole("button").length).toBeLessThan(wholeYear);
  });

  it("goes back to the window's own count when the day tapped goes off screen", () => {
    const { getByLabelText, getByText } = render(
      <UnlockCalendarBlock tallies={libraryUnlocking({ 200: 5 })} loaded={null} />,
    );

    fireEvent.press(getByLabelText(labelFor(200, 5)));
    fireEvent.press(getByText("3m"));

    expect(getByText(EMPTY_WINDOW)).toBeTruthy();
  });

  /**
   * #30 puts a tab strip on the left of this row. The chips have to be where
   * they will stay once it arrives, so the row is already laid out for two.
   */
  it("keeps the left of its control row empty for what comes next", () => {
    const { getByTestId } = render(
      <UnlockCalendarBlock tallies={COUNTED_AND_QUIET} loaded={null} />,
    );
    const controls = getByTestId(UNLOCK_CALENDAR_CONTROLS_TEST_ID);

    expect(controls).toHaveStyle({ justifyContent: "space-between" });
    expect(controls.props.children[0].props.children).toBeUndefined();
  });

  it("names the months the window runs between", () => {
    const today = new Date();
    const { getByText } = render(
      <UnlockCalendarBlock tallies={COUNTED_AND_QUIET} loaded={null} />,
    );

    const thisMonth = today
      .toLocaleString("en-US", { month: "short" })
      .toLowerCase();
    expect(
      getByText(`${thisMonth} ${String(today.getFullYear()).slice(-2)}`),
    ).toBeTruthy();
  });
});
