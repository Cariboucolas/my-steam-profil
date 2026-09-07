import { fireEvent, render, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { UNLOCK_DAY_TEST_ID } from "../molecules/UnlockMonthRow";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import {
  DECEMBER_HEIGHT,
  SCROLLED_PAST,
  scrolledTo,
  SIX_ROWS,
} from "../../view-models/unlock-calendar-scroll.test-support";
import { UNLOCK_HEADER_TEST_ID } from "../molecules/UnlockCalendarHeader";
import { UNLOCK_HALF_DOT_TEST_ID } from "../molecules/UnlockHalfDots";
import { UNLOCK_LEGEND_TEST_ID } from "../molecules/UnlockToneLegend";
import { colors } from "../../theme/tokens";
import {
  UnlockCalendarCard,
  UNLOCK_CALENDAR_CARD_TEST_ID,
  UNLOCK_CALENDAR_GRID_TEST_ID,
  UNLOCK_FADE_BOTTOM_TEST_ID,
  UNLOCK_FADE_TOP_TEST_ID,
} from "./UnlockCalendarCard";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * A year that has reached the 5th of the month it names, scaled as ADR-0007
 * has it. How far the year has got is what decides whether the card scrolls,
 * so the tests below say it by naming a month.
 */
const yearTo = (monthsDrawn: number): UnlockCalendar => ({
  year: 2026,
  total: 0,
  lastYearsTotal: null,
  deltaLabel: null,
  frameLabel: "YEAR 2026 · JAN → DEC",
  months: MONTHS.slice(0, monthsDrawn).map((label, index) => {
    const current = index === monthsDrawn - 1;
    const drawn = current ? 5 : DAYS_IN[index]!;

    return {
      label,
      current,
      total: 0,
      totalLabel: "—",
      days: Array.from({ length: 31 }, (_, day) =>
        day + 1 > drawn ? null : { count: 0, tone: 0 },
      ),
    };
  }),
  legend: [
    { tone: 0, label: "0" },
    { tone: 1, label: "1-2" },
    { tone: 2, label: "3-5" },
    { tone: 3, label: "6-11" },
    { tone: 4, label: "12+" },
  ],
  counting: false,
  scale: [2, 5, 11],
});

/** March, where the card is six rows short of having anything to scroll. */
const calendar = yearTo(3);

describe("UnlockCalendarCard", () => {
  it("draws a row for every month the year has reached", () => {
    const { getByText, queryByText } = render(
      <UnlockCalendarCard calendar={calendar} />,
    );

    // A label carries its month's total, so it reads "JAN —" for a month
    // that held nothing.
    expect(getByText("JAN —")).toBeTruthy();
    expect(getByText("MAR —")).toBeTruthy();
    // April has not begun, so it has no row rather than an empty one.
    expect(queryByText(/^APR/)).toBeNull();
  });

  it("draws every day those months hold", () => {
    const { getAllByTestId } = render(
      <UnlockCalendarCard calendar={calendar} />,
    );

    expect(getAllByTestId(UNLOCK_DAY_TEST_ID)).toHaveLength(31 + 28 + 5);
  });

  /**
   * Every pixel spent on a margin is a pixel the day cells do not get, and at
   * this width they have none to spare: a card inset like the stats card above
   * it puts the cell at 7.8px, under what four tones need to be told apart.
   * The band runs the full width of the screen instead, and only its own rows
   * hold the grid off the edge.
   */
  it("spends no width on a horizontal margin", () => {
    const { getByTestId } = render(<UnlockCalendarCard calendar={calendar} />);
    const band = getByTestId(UNLOCK_CALENDAR_CARD_TEST_ID);
    const style = StyleSheet.flatten(band.props.style);

    expect(style.marginHorizontal ?? 0).toBe(0);
    expect(style.paddingHorizontal ?? 0).toBe(0);
  });
  /**
   * The tone scale is read over a window that does not match the year the grid
   * draws, so the boundaries have to be written down rather than inferred from
   * the picture — and at a size the 9-pixel cells could never carry (ADR-0007).
   */
  it("prints the numbers behind each tone", () => {
    const { getByTestId } = render(<UnlockCalendarCard calendar={calendar} />);
    // Read inside the legend: a year total of nothing writes a "0" of its own
    // in the header, and the two zeroes say different things.
    const legend = within(getByTestId(UNLOCK_LEGEND_TEST_ID));

    for (const band of ["0", "1-2", "3-5", "6-11", "12+"]) {
      expect(legend.getByText(band)).toBeTruthy();
    }
  });

  /**
   * The header is handed its figures written, comparison and all: the card
   * states where the player stands and works none of it out for itself.
   */
  it("says where the player stands in the year it draws", () => {
    const { getByTestId } = render(
      <UnlockCalendarCard
        calendar={{
          ...calendar,
          total: 82,
          lastYearsTotal: 306,
          deltaLabel: "-224 vs all of 2025 (306)",
        }}
      />,
    );
    // Read inside the header, as the legend's bands are read inside the
    // legend: the grid below writes figures of its own.
    const header = within(getByTestId(UNLOCK_HEADER_TEST_ID));

    expect(header.getByText("Activity")).toBeTruthy();
    expect(header.getByText("82")).toBeTruthy();
    expect(header.getByText("YEAR 2026 · JAN → DEC")).toBeTruthy();
    expect(header.getByText("-224 vs all of 2025 (306)")).toBeTruthy();
  });

  it("never falls back on less and more", () => {
    const { queryByText } = render(<UnlockCalendarCard calendar={calendar} />);

    expect(queryByText(/less/i)).toBeNull();
    expect(queryByText(/more/i)).toBeNull();
  });
});

/** A full year, drawn and then measured as layout would measure it. */
const december = () => {
  const view = render(<UnlockCalendarCard calendar={yearTo(12)} />);
  const grid = view.getByTestId(UNLOCK_CALENDAR_GRID_TEST_ID);

  fireEvent(grid, "contentSizeChange", 320, DECEMBER_HEIGHT);

  return { ...view, grid };
};

describe("a year taller than the card", () => {
  it("holds itself to six rows and scrolls the rest", () => {
    const { grid } = december();

    expect(StyleSheet.flatten(grid.props.style).maxHeight).toBe(SIX_ROWS);
  });

  /**
   * Thirty-one columns are made to fit the phone rather than run off it
   * (#37), and the one movement this card has is downwards — as far as the
   * year goes and no further. The library list it sits in bounces; a grid
   * bouncing inside it would be pulling away from an edge the card is meant
   * to be holding.
   */
  it("moves the year down, never sideways, and never past its own edges", () => {
    const { grid } = december();

    expect(grid.props.horizontal).toBeFalsy();
    expect(grid.props.bounces).toBe(false);
  });

  it("marks the edge that has more year beyond it", () => {
    const { getByTestId, grid, queryByTestId } = december();

    // At rest at the top of the year: December is what is out of sight.
    expect(getByTestId(UNLOCK_FADE_BOTTOM_TEST_ID)).toBeTruthy();
    expect(queryByTestId(UNLOCK_FADE_TOP_TEST_ID)).toBeNull();

    fireEvent.scroll(grid, scrolledTo(SCROLLED_PAST));

    // Scrolled to the end: now it is January.
    expect(getByTestId(UNLOCK_FADE_TOP_TEST_ID)).toBeTruthy();
    expect(queryByTestId(UNLOCK_FADE_BOTTOM_TEST_ID)).toBeNull();
  });

  it("says which half of the year is in view", () => {
    const { getAllByTestId, grid } = december();
    const painted = () =>
      getAllByTestId(UNLOCK_HALF_DOT_TEST_ID).map(
        (dot) => dot.props.style.backgroundColor,
      );

    expect(painted()).toEqual([colors.accent, colors.textFaint]);

    fireEvent.scroll(grid, scrolledTo(SCROLLED_PAST));

    expect(painted()).toEqual([colors.textFaint, colors.accent]);
  });
});

/**
 * Before July the whole year fits the six rows the card holds. Nothing is
 * scrolled, and so nothing says anything about scrolling: a control that
 * appears when it becomes true beats one offered for a movement that is not
 * possible.
 */
describe("a year the card holds whole", () => {
  it("draws every month it has reached with no scroll and no dots", () => {
    const { getByText, queryAllByTestId, queryByTestId } = render(
      <UnlockCalendarCard calendar={yearTo(6)} />,
    );

    expect(getByText("JAN —")).toBeTruthy();
    expect(getByText("JUN —")).toBeTruthy();
    expect(queryByTestId(UNLOCK_CALENDAR_GRID_TEST_ID)).toBeNull();
    expect(queryAllByTestId(UNLOCK_HALF_DOT_TEST_ID)).toHaveLength(0);
    expect(queryByTestId(UNLOCK_FADE_BOTTOM_TEST_ID)).toBeNull();
  });
});
