import type { GameDto } from "@steam/contracts";
import { renderHook } from "@testing-library/react-native";

import type { CountedUnlocks } from "./unlock-days";
import type { UnlockWeek } from "./unlock-week";
import { useUnlockWeek } from "./use-unlock-week";

const GAMES: readonly GameDto[] = [
  {
    appId: 1,
    name: "Game 1",
    playtimeMinutes: 60,
    iconUrl: "https://icon/1.jpg",
    lastPlayedAt: null,
  },
];

/** 18 April 2026 is a Saturday; the 20th, 21st and 22nd are Monday to Wednesday. */
const instant = (day: number, hour: number, minute = 0): number =>
  new Date(2026, 3, day, hour, minute).getTime() / 1000;

const waveOf = (games: readonly GameDto[], instants: readonly number[]): CountedUnlocks => ({
  games,
  tallies: {
    1: {
      completion: { unlocked: instants.length, total: 100, percentage: 0 },
      unlocks: instants.map((at, n) => ({ apiName: `ACH_${n}`, at })),
    },
  },
});

const eight = (day: number): number[] => Array.from({ length: 8 }, (_, n) => instant(day, 10, n));

/** One Saturday unlock: the scale it reads on its own is 1, 2, 3. */
const FIRST_WAVE = waveOf(GAMES, [instant(18, 21)]);
/** Three busy mornings beside it: read afresh, the scale would be 1, 8, 9. */
const BUSY_MORNINGS = [instant(18, 21), ...eight(20), ...eight(21), ...eight(22)];
const SECOND_WAVE = waveOf(GAMES, BUSY_MORNINGS);

const ALONE = ["0", "1", "2", "3", "4+"];
const BESIDE_THE_MORNINGS = ["0", "1", "2-8", "9", "10+"];

const legendOf = (week: UnlockWeek): readonly string[] =>
  week.kind === "drawn" ? week.legend.map((band) => band.label) : [];

describe("useUnlockWeek", () => {
  const render = (view: CountedUnlocks, counted: boolean) =>
    renderHook(
      ({ view: v, counted: c }: { view: CountedUnlocks; counted: boolean }) =>
        useUnlockWeek(v, c, "en"),
      {
        initialProps: { view, counted },
      },
    );

  it("holds the scale the first wave read while the rest land", () => {
    const { result, rerender } = render(FIRST_WAVE, false);
    expect(legendOf(result.current)).toEqual(ALONE);

    rerender({ view: SECOND_WAVE, counted: false });
    expect(legendOf(result.current)).toEqual(ALONE);
  });

  it("reads the scale afresh once counted", () => {
    const { result, rerender } = render(FIRST_WAVE, false);
    rerender({ view: SECOND_WAVE, counted: false });
    rerender({ view: SECOND_WAVE, counted: true });

    expect(legendOf(result.current)).toEqual(BESIDE_THE_MORNINGS);
  });

  it("lets another library read its own scale mid-count", () => {
    const { result, rerender } = render(FIRST_WAVE, false);
    // Another load: the same games, in a fresh array.
    rerender({ view: waveOf([...GAMES], BUSY_MORNINGS), counted: false });

    expect(legendOf(result.current)).toEqual(BESIDE_THE_MORNINGS);
  });
});
