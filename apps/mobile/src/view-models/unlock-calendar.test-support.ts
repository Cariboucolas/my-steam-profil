import type { GameDto, GameTallyDto } from "@steam/contracts";

import type { LibraryView } from "./library";

/**
 * The libraries and the days the calendar is read from, shared by the builder's
 * tests and the hook's: the two read the same load from either end, and a
 * fixture that drifted between them would have them agreeing about different
 * players.
 */

export const SOULSTONE = 2066020;
export const HALLS = 2218750;
export const EXILE = 2694490;

/** The day the calendars are built against, where they share one. */
export const NOW = new Date("2026-04-17T10:00:00Z");

const game = (appId: number): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 120,
  playtimeLabel: "2 h",
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt: null,
});

/**
 * Only the dates decide a calendar, so the completion half stays nominal and
 * the names are just distinct enough to be one unlock apiece.
 */
const tally = (unlockedAt: readonly number[]): GameTallyDto => ({
  completion: { unlocked: unlockedAt.length, total: 100, percentage: 0 },
  unlocks: unlockedAt.map((at, index) => ({ apiName: `ACH_${index}`, at })),
});

/** Epoch seconds, as the wire carries them. */
const at = (iso: string): number => Date.parse(iso) / 1000;

/**
 * The three games a load is made of. Held rather than rebuilt per view,
 * because a load is its games: every view of one load names the very same
 * array, as the screen and `useLibraryTallies` do. Three, because a load that
 * has landed one tally and is still waiting on another needs a third.
 */
const LIBRARY: readonly GameDto[] = [game(SOULSTONE), game(HALLS), game(EXILE)];

/** The same three titles in another player's hands: another load entirely. */
export const ANOTHER_LIBRARY: readonly GameDto[] = [
  game(SOULSTONE),
  game(HALLS),
  game(EXILE),
];

/**
 * A library, counted. A game named here has been counted; one left out has a
 * tally still on its way, as it would mid-load.
 */
export const libraryWhereUnlocksHappened = (
  unlocks: Readonly<Record<number, readonly string[]>> = {},
  games: readonly GameDto[] = LIBRARY,
): LibraryView => ({
  games,
  tallies: Object.fromEntries(
    Object.entries(unlocks).map(([appId, instants]) => [
      Number(appId),
      tally(instants.map(at)),
    ]),
  ),
  sort: "completed",
  pending: new Set<number>(),
  frozenOrder: null,
});

/**
 * The same library, with `count` more unlocks the player really earned in that
 * game and Steam would not date. The tally counts them; they fall on no day.
 */
export const withUndatedUnlocks = (
  view: LibraryView,
  appId: number,
  count: number,
): LibraryView => {
  const held = view.tallies[appId];
  if (!held) throw new Error(`no tally for ${appId} to add unlocks to`);

  return {
    ...view,
    tallies: {
      ...view.tallies,
      [appId]: {
        completion: {
          ...held.completion,
          unlocked: held.completion.unlocked + count,
        },
        unlocks: [
          ...held.unlocks,
          ...Array.from({ length: count }, (_, index) => ({
            apiName: `UNDATED_${index}`,
            at: null,
          })),
        ],
      },
    },
  };
};

/** The same library, with a tally still on its way for the games named. */
export const stillCounting = (
  view: LibraryView,
  outstanding: readonly number[],
): LibraryView => ({ ...view, pending: new Set(outstanding) });

const twoDigits = (value: number): string => String(value).padStart(2, "0");

/**
 * `count` unlocks all falling on the one day `date` names, minutes apart, as a
 * busy day really arrives. A day busy enough to fill the hour runs on into the
 * next, so that a few hundred can be written on the one day and still land on
 * the day they name — the fifteen hours that leaves being more day than any
 * fixture here needs.
 */
export const heldBy = (date: string, count: number): readonly string[] =>
  Array.from(
    { length: count },
    (_, index) =>
      `${date}T${twoDigits(9 + Math.floor(index / 60))}:${twoDigits(
        index % 60,
      )}:00Z`,
  );

/**
 * Four days holding 2, 5, 11 and 20 unlocks are their own quartiles, and read
 * the scale ADR-0007 prints as `0 · 1-2 · 3-5 · 6-11 · 12+`.
 */
export const APRIL_PEAKS = [
  ...heldBy("2026-04-01", 2),
  ...heldBy("2026-04-02", 5),
  ...heldBy("2026-04-03", 11),
  ...heldBy("2026-04-04", 20),
];

/**
 * Twenty steady days of three unlocks. Landing them beside the four busy ones
 * pulls every quartile down onto them, so a scale read before they arrived and
 * one read after cannot be confused.
 */
export const MARCH_STEADY = Array.from({ length: 20 }, (_, index) =>
  heldBy(`2026-03-${String(index + 1).padStart(2, "0")}`, 3),
).flat();
