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

  get hours(): number | null {
    return this.minutes === null ? null : this.minutes / 60;
  }

  /** The figure as a reader should see it, or null when there is no figure. */
  format(): string | null {
    if (this.minutes === null) return null;
    const h = Math.floor(this.minutes / 60);
    const m = this.minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${String(m).padStart(2, "0")}`;
  }
}
