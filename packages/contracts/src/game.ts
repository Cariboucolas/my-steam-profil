/**
 * A Game as it travels over the wire.
 *
 * Playtime is minutes and nothing else. Where Steam declines to report the
 * figure it is absent, never a zero: zero minutes is a Game that was never
 * launched, and a withheld hour written as zero calls a Game unplayed beside
 * the Unlocks that prove it was played (CONTEXT.md, Playtime).
 *
 * Steam withholds across a whole library rather than one Game at a time, so
 * the two can only be told apart by whoever holds the library. That is done
 * once, where the library is mapped, so that a client holding a single Game —
 * the game screen does — can still read which of the two it has.
 *
 * Nothing here carries its own rendering. The hours a reader sees are written
 * by the screen that draws them: how wide a figure is, and how much of it
 * survives rounding, are the screen's questions (ADR-0015).
 */
export interface GameDto {
  readonly appId: number;
  readonly name: string;
  /** Minutes played, or null where Steam publishes no figure for this library. */
  readonly playtimeMinutes: number | null;
  readonly iconUrl: string;
  /** ISO 8601, or null when the player never launched the game. */
  readonly lastPlayedAt: string | null;
}
