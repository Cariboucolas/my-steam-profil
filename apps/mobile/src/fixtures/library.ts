import type { GameDto, GameTallyDto } from "@steam/contracts";

import type { LibraryView, TallyByAppId } from "../view-models/library";

const MINUTES_PER_HOUR = 60;

const game = (appId: number, name: string, hours: number | null): GameDto => ({
  appId,
  name,
  playtimeMinutes: hours === null ? null : hours * MINUTES_PER_HOUR,
  iconUrl: "",
  lastPlayedAt: "2026-06-25T20:14:00Z",
});

const tally = (unlocked: number, total: number): GameTallyDto => ({
  completion: {
    unlocked,
    total,
    percentage: total === 0 ? 0 : Math.round((unlocked / total) * 100),
  },
  unlocks: [],
});

/** A library as it looks once every tally is in, played and counted. */
const GAMES: readonly GameDto[] = [
  game(1245620, "Elden Ring", 212),
  game(1145360, "Hades", 96),
  game(413150, "Stardew Valley", 340),
  game(367520, "Hollow Knight", 58),
];

const TALLIES: TallyByAppId = {
  1245620: tally(42, 42),
  1145360: tally(38, 49),
  413150: tally(31, 40),
  367520: tally(17, 63),
};

const view = (
  games: readonly GameDto[],
  tallies: TallyByAppId,
): LibraryView => ({
  games,
  tallies,
  sort: "completed",
  pending: new Set(),
  frozenOrder: null,
});

export const countedLibrary: LibraryView = view(GAMES, TALLIES);

/** Two of the four tallies have landed; the other two are still on their way. */
export const landingLibrary: LibraryView = view(GAMES, {
  1245620: tally(42, 42),
  1145360: tally(38, 49),
});

/** The same library on a profile whose hours Steam does not publish. */
export const playtimeWithheldLibrary: LibraryView = view(
  GAMES.map((one) => ({ ...one, playtimeMinutes: null })),
  TALLIES,
);

/**
 * A collector's library, whose unlock count is too long to be written out in
 * full on a phone and has to be shortened (ADR-0011).
 */
export const collectorLibrary: LibraryView = view(GAMES, {
  1245620: tally(61_204, 70_000),
  1145360: tally(38_500, 49_000),
  413150: tally(31_000, 40_000),
  367520: tally(17_000, 63_000),
});
