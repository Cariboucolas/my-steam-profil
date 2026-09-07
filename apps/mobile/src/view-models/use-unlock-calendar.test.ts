import { renderHook } from "@testing-library/react-native";

import type { LibraryView } from "./library";
import type { UnlockCalendar } from "./unlock-calendar";
import {
  APRIL_PEAKS,
  EXILE,
  HALLS,
  libraryWhereUnlocksHappened,
  MARCH_STEADY,
  NOW,
  SOULSTONE,
  stillCounting,
} from "./unlock-calendar.test-support";
import { useUnlockCalendar } from "./use-unlock-calendar";

/** The scale the four busy April days read on their own. */
const BUSY_SCALE = ["0", "1-2", "3-5", "6-11", "12+"];

/** The scale they read once the twenty steady days have landed beside them. */
const STEADY_SCALE = ["0", "1-3", "4", "5", "6+"];

/** What a calendar with nothing of the player's own in hand is drawn against. */
const STAND_IN = ["0", "1", "2", "3", "4+"];

/** A library part counted: what has landed, and what is still on its way. */
const libraryWhere = (
  unlocks: Readonly<Record<number, readonly string[]>>,
  outstanding: readonly number[],
): LibraryView =>
  stillCounting(libraryWhereUnlocksHappened(unlocks), outstanding);

/**
 * Where a cold library really starts: every tally asked for, not one back.
 * The load sets its outstanding set before it has anything to show for it.
 */
const AWAITING = libraryWhere({}, [SOULSTONE, HALLS, EXILE]);
/** One wave in, two to go. */
const FIRST_WAVE = libraryWhere({ [SOULSTONE]: APRIL_PEAKS }, [HALLS, EXILE]);
/** The steady month has landed since, and a tally is still outstanding. */
const SECOND_WAVE = libraryWhere(
  { [SOULSTONE]: APRIL_PEAKS, [HALLS]: MARCH_STEADY },
  [EXILE],
);
/** Everything that was coming has come. */
const COUNTED = libraryWhere(
  { [SOULSTONE]: APRIL_PEAKS, [HALLS]: MARCH_STEADY },
  [],
);

const legendOf = (calendar: UnlockCalendar): readonly string[] =>
  calendar.legend.map((band) => band.label);

const totalOf = (calendar: UnlockCalendar, label: string): number =>
  calendar.months.find((month) => month.label === label)?.total ?? -1;

const calendarFor = (view: LibraryView) =>
  renderHook(({ shown }: { shown: LibraryView }) => useUnlockCalendar(shown, NOW), {
    initialProps: { shown: view },
  });

describe("useUnlockCalendar", () => {
  /**
   * The load has its outstanding set before it has a single tally, so the very
   * first counting render has nothing of the player's own to read a scale off.
   * Holding the stand-in it draws against would spend the whole load on fixed
   * thresholds, which is the failure ADR-0007 rules out.
   */
  it("waits for a day of the player's own before it holds anything", () => {
    const { result, rerender } = calendarFor(AWAITING);
    expect(legendOf(result.current)).toEqual(STAND_IN);

    rerender({ shown: FIRST_WAVE });

    expect(legendOf(result.current)).toEqual(BUSY_SCALE);
  });

  /**
   * Six tallies at a time, most recently played first: recent months fill
   * before old ones, so a scale read afresh on every wave would repaint the
   * whole grid dozens of times over one cold open (ADR-0007).
   */
  it("holds the scale it read while the waves land", () => {
    const { result, rerender } = calendarFor(AWAITING);
    rerender({ shown: FIRST_WAVE });

    rerender({ shown: SECOND_WAVE });

    expect(legendOf(result.current)).toEqual(BUSY_SCALE);
    // The grid fills all the same: what landed since is drawn, on that scale.
    expect(totalOf(result.current, "MAR")).toBe(60);
  });

  it("reads the scale once more when the last tally has landed", () => {
    const { result, rerender } = calendarFor(AWAITING);
    rerender({ shown: FIRST_WAVE });

    rerender({ shown: COUNTED });

    expect(legendOf(result.current)).toEqual(STEADY_SCALE);
  });

  /**
   * A scale is held for the load that read it and no longer. The next profile
   * counts from nothing, and a scale carried over from the previous one would
   * colour its whole load against a library it never held.
   */
  it("reads a fresh scale for the load after it", () => {
    const { result, rerender } = calendarFor(AWAITING);
    rerender({ shown: SECOND_WAVE });
    rerender({ shown: COUNTED });

    rerender({ shown: FIRST_WAVE });

    expect(legendOf(result.current)).toEqual(BUSY_SCALE);
  });
});
