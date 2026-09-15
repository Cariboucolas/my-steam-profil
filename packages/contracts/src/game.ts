/**
 * A Game as it travels over the wire. Playtime is carried twice on purpose:
 * the raw minutes so clients can sort, and the label so every client formats
 * playtime the same way.
 *
 * Both halves are null together where Steam declines to report the figure at
 * all. That is an absence and never a zero: zero minutes is a Game that was
 * never launched, and a withheld hour written as zero calls a Game unplayed
 * beside the Unlocks that prove it was played (CONTEXT.md, Playtime).
 *
 * Steam withholds across a whole library rather than one Game at a time, so
 * the two can only be told apart by whoever holds the library. That is done
 * once, where the library is mapped, so that a client holding a single Game —
 * the game screen does — can still read which of the two it has.
 */
export interface GameDto {
  readonly appId: number;
  readonly name: string;
  /** Minutes played, or null where Steam publishes no figure for this library. */
  readonly playtimeMinutes: number | null;
  /** The same figure as a reader sees it, or null where there is no figure. */
  readonly playtimeLabel: string | null;
  readonly iconUrl: string;
  /** ISO 8601, or null when the player never launched the game. */
  readonly lastPlayedAt: string | null;
}
