import type { GameDto, GameTallyDto } from "@steam/contracts";
import { renderHook } from "@testing-library/react-native";

import type { LibraryView } from "./library";
import type { UnlockCalendar } from "./unlock-calendar";
import { useUnlockCalendar } from "./use-unlock-calendar";

const SOULSTONE = 2066020;
const HALLS = 2218750;
const EXILE = 2694490;

/** The day every calendar below is built against. */
const NOW = new Date("2026-04-17T10:00:00Z");

const game = (appId: number): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 120,
  playtimeLabel: "2 h",
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt: null,
});

/** Only the dates decide a scale, so the completion half stays nominal. */
const tally = (unlockedAt: readonly number[]): GameTallyDto => ({
  completion: { unlocked: unlockedAt.length, total: 100, percentage: 0 },
  unlockedAt,
});

/** `count` unlocks all falling on the one day `date` names, minutes apart. */
const heldBy = (date: string, count: number): readonly string[] =>
  Array.from(
    { length: count },
    (_, index) => `${date}T09:${String(index).padStart(2, "0")}:00Z`,
  );

/** Four days of 2, 5, 11 and 20 unlocks, and the scale they read. */
const APRIL_PEAKS = [
  ...heldBy("2026-04-01", 2),
  ...heldBy("2026-04-02", 5),
  ...heldBy("2026-04-03", 11),
  ...heldBy("2026-04-04", 20),
];
const BUSY_SCALE = ["0", "1-2", "3-5", "6-11", "12+"];

/** Twenty steady days of three, and the scale the two of them read together. */
const MARCH_STEADY = Array.from({ length: 20 }, (_, index) =>
  heldBy(`2026-03-${String(index + 1).padStart(2, "0")}`, 3),
).flat();
const STEADY_SCALE = ["0", "1-3", "4", "5", "6+"];

/** What a calendar with nothing of the player's own in hand is drawn against. */
const STAND_IN = ["0", "1", "2", "3", "4+"];

/**
 * A library of three games, part counted. A game named in `unlocks` has been
 * counted; one named in `outstanding` has a tally still on its way.
 */
const libraryWhere = (
  unlocks: Readonly<Record<number, readonly string[]>>,
  outstanding: readonly number[],
): LibraryView => ({
  games: [game(SOULSTONE), game(HALLS), game(EXILE)],
  tallies: Object.fromEntries(
    Object.entries(unlocks).map(([appId, instants]) => [
      Number(appId),
      tally(instants.map((iso) => Date.parse(iso) / 1000)),
    ]),
  ),
  sort: "completed",
  pending: new Set(outstanding),
  frozenOrder: null,
});

/**
 * Where a cold library really starts: every tally asked for, not one back.
 * The load sets its outstanding set before it has anything to show for it.
 */
const AWAITING = libraryWhere({}, [SOULSTONE, HALLS, EXILE]);
/** One wave in, two to go. */
const FIRST_WAVE = libraryWhere({ [SOULSTONE]: APRIL_PEAKS }, [HALLS, EXILE]);
/** The quiet month has landed since, and a tally is still outstanding. */
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
