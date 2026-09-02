import { fireEvent, render } from "@testing-library/react-native";

import { SCROLL_RAIL_THUMB_TEST_ID } from "../atoms/ScrollRail";
import {
  describeDay,
  type UnlockDay,
  type UnlockWeek,
} from "../../view-models/unlock-calendar";
import { UnlockGrid, UNLOCK_GRID_TEST_ID } from "./UnlockGrid";

const MONDAY = new Date(2026, 7, 24).getTime();
const DAY_MS = 86_400_000;

const day = (index: number, count: number, step: number): UnlockDay => ({
  at: MONDAY + index * DAY_MS,
  count,
  step,
});

/** A full week, then this week: Monday, Tuesday, today, and no more. */
const WEEKS: readonly UnlockWeek[] = [
  Array.from({ length: 7 }, (_unused, index) => day(index - 7, index, 1)),
  [day(0, 45, 4), day(1, 0, 0), day(2, 3, 2), null, null, null, null],
];

const gridWith = (
  onSelect: (unlockDay: UnlockDay) => void = () => undefined,
  selectedAt: number | null = null,
) => render(<UnlockGrid weeks={WEEKS} selectedAt={selectedAt} onSelect={onSelect} />);

describe("UnlockGrid", () => {
  it("draws a cell for every day it was given", () => {
    const { getAllByRole } = gridWith();

    expect(getAllByRole("button")).toHaveLength(10);
  });

  /**
   * A day that has not happened is not a day with nothing on it, so the last
   * column is cut short rather than filled with four quiet Thursdays.
   */
  it("draws nothing a reader can press for a day beyond today", () => {
    const { queryByLabelText } = gridWith();

    expect(queryByLabelText(describeDay(day(3, 0, 0)))).toBeNull();
  });

  it("says what a day holds to anyone who cannot see its tone", () => {
    const { getByLabelText } = gridWith();

    expect(getByLabelText(describeDay(day(0, 45, 4)))).toBeTruthy();
  });

  it("reports the day a reader taps", () => {
    const taps: UnlockDay[] = [];
    const { getByLabelText } = gridWith((unlockDay) => taps.push(unlockDay));

    fireEvent.press(getByLabelText(describeDay(day(0, 45, 4))));

    expect(taps).toEqual([day(0, 45, 4)]);
  });

  it("marks the day being read as the selected one", () => {
    const { getByLabelText } = gridWith(() => undefined, MONDAY);

    expect(
      getByLabelText(describeDay(day(0, 45, 4))).props.accessibilityState
        .selected,
    ).toBe(true);
  });

  it("draws a quiet day and a busy one differently", () => {
    const { getByLabelText } = gridWith();

    const quiet = getByLabelText(describeDay(day(1, 0, 0))).props.style;
    const busy = getByLabelText(describeDay(day(0, 45, 4))).props.style;

    expect(quiet.backgroundColor).not.toBe(busy.backgroundColor);
  });

  it("says nothing overflows until it has been measured against a viewport", () => {
    const { queryByTestId } = gridWith();

    expect(queryByTestId(SCROLL_RAIL_THUMB_TEST_ID)).toBeNull();
  });

  it("shows what is off screen once the grid is wider than the viewport", () => {
    const { getByTestId, queryByTestId } = gridWith();
    const grid = getByTestId(UNLOCK_GRID_TEST_ID);

    fireEvent(grid, "layout", { nativeEvent: { layout: { width: 300 } } });
    fireEvent(grid, "contentSizeChange", 1200, 90);

    expect(queryByTestId(SCROLL_RAIL_THUMB_TEST_ID)).toBeTruthy();
  });

  it("shows nothing off screen when a whole window fits", () => {
    const { getByTestId, queryByTestId } = gridWith();
    const grid = getByTestId(UNLOCK_GRID_TEST_ID);

    fireEvent(grid, "layout", { nativeEvent: { layout: { width: 300 } } });
    fireEvent(grid, "contentSizeChange", 120, 90);

    expect(queryByTestId(SCROLL_RAIL_THUMB_TEST_ID)).toBeNull();
  });
});
