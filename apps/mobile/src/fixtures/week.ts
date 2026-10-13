import type { CountedUnlocks } from "../view-models/unlock-days";
import { LIBRARY_GAMES } from "./library";

const DAYS_BACK = 400;
const MS_PER_DAY = 86_400_000;

/**
 * Evenings on weekdays, afternoons and late nights at the weekend: a week
 * with a shape, so every tone and a busiest hour show.
 */
const hoursOn = (weekday: number): readonly number[] =>
  weekday === 0 || weekday === 6 ? [14, 15, 21, 22, 23, 1] : [19, 21, 21, 22];

const unlocksBefore = (today: Date): CountedUnlocks["tallies"][number]["unlocks"] =>
  Array.from({ length: DAYS_BACK }, (_, back) => new Date(today.getTime() - back * MS_PER_DAY))
    // A day in three off, as a real player takes them.
    .filter((_, back) => back % 3 !== 1)
    .flatMap((day) =>
      hoursOn(day.getDay())
        .slice(0, 1 + (day.getDate() % hoursOn(day.getDay()).length))
        .map((hour, n) => ({
          apiName: `ACH_${day.getTime()}_${n}`,
          at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, n).getTime() / 1000,
        })),
    );

/** A library whose player has a typical week, unlocking up to `today`. */
export const typicalWeek = (today: Date): CountedUnlocks => ({
  games: LIBRARY_GAMES,
  tallies: {
    [LIBRARY_GAMES[0]?.appId ?? 0]: {
      completion: { unlocked: 1, total: 1, percentage: 100 },
      unlocks: unlocksBefore(today),
    },
  },
});
/** One unlock, on a Saturday at 9 pm: the least a week can be drawn from. */
export const ONE_UNLOCK_WEEK: CountedUnlocks = {
  games: LIBRARY_GAMES,
  tallies: {
    [LIBRARY_GAMES[0]?.appId ?? 0]: {
      completion: { unlocked: 1, total: 1, percentage: 100 },
      unlocks: [{ apiName: "ACH", at: new Date(2026, 3, 18, 21, 30).getTime() / 1000 }],
    },
  },
};
