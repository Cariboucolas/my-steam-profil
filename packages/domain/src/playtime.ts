/**
 * How long a player has spent in a Game, where that can be said at all.
 *
 * Steam governs playtime's visibility on its own, separately from the
 * Profile's and from the Achievements' — a public Profile can publish every
 * Unlock and withhold every hour — so a Playtime Steam declines to report is
 * absent rather than zero (CONTEXT.md, Playtime). Zero minutes is a Game that
 * was never launched; absent is a Game whose hours are not ours to know, and
 * neither may be read as the other.
 *
 * Absence is a missing figure rather than a flag beside a zero, which is the
 * line Rarity already draws over a figure Steam publishes for nobody and
 * Unlock over a date Steam will not give.
 *
 * Which of the two a bare zero is can only be told from the library it sits
 * in, so nothing here decides it: a Playtime is handed whichever it already
 * is. `mapGames` is where the two are told apart, because it is the only place
 * that holds a library whole.
 *
 * It holds the figure and nothing else. What the figure looks like to a reader
 * belongs to whoever draws it (ADR-0015), so the writing lives below, in a
 * free function any process can call.
 */
export class Playtime {
  private constructor(
    /** Minutes played, or null where Steam declines to report the figure. */
    public readonly minutes: number | null,
  ) {}

  static fromMinutes(minutes: number): Playtime {
    if (!Number.isFinite(minutes) || minutes < 0) {
      throw new RangeError(`Invalid playtime: ${minutes}`);
    }
    return new Playtime(Math.round(minutes));
  }

  /** A Playtime Steam withheld: no figure, and none to be invented. */
  static absent(): Playtime {
    return new Playtime(null);
  }
}

const MINUTES_PER_HOUR = 60;

/**
 * Minutes as a reader sees them, to the minute: `6 h 45`, `2 h`, `45 min`.
 *
 * A free function rather than a method, so a screen holding minutes that came
 * off the wire can apply the rule without going through `fromMinutes`, which
 * validates and throws — an invariant that belongs at the boundary where the
 * figure enters, not at the point where it is drawn (ADR-0015).
 *
 * This is the exact writing. A library row shortens further, to whole hours
 * with its thousands grouped, because a row is a fixed width and an exact
 * figure is paid for in its own typography (ADR-0011, ADR-0013). The two are
 * deliberately not the same string, which is why they are not the same name.
 */
export const formatPlaytimeExact = (minutes: number): string => {
  const h = Math.floor(minutes / MINUTES_PER_HOUR);
  const m = minutes % MINUTES_PER_HOUR;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
};
