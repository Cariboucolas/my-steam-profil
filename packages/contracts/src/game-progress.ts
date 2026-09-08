import type { AchievementDto } from "./achievement";

/** A GameCompletion over the wire; CompletionRate becomes a plain number. */
export interface GameCompletionDto {
  readonly unlocked: number;
  readonly total: number;
  readonly percentage: number;
}

/** One Timeline entry: which achievement was earned, and when (ISO 8601). */
export interface TimelineEntryDto {
  readonly apiName: string;
  readonly unlockedAt: string;
}

/** Everything there is to say about one player in one Game. */
export interface GameProgressDto {
  readonly completion: GameCompletionDto;
  readonly achievements: readonly AchievementDto[];
  readonly timeline: readonly TimelineEntryDto[];
}

/**
 * One unlocked Achievement as the tally carries it: which one, and when.
 *
 * Named rather than dated alone, because a date says when a player was
 * unlocking and a name says what they unlocked — and only the name can be
 * crossed with what Steam publishes about the Achievement (ADR-0009).
 */
export interface UnlockDto {
  /** Unique within its Game, and only within it. */
  readonly apiName: string;
  /**
   * Epoch seconds, or null where Steam flags the unlock earned and dates it at
   * the epoch — that is Steam saying it does not know when, not a January
   * morning in 1970.
   */
  readonly at: number | null;
}

/**
 * What the completion route answers: the tally, and the unlocks it counted.
 *
 * Two named parts rather than a wider GameCompletionDto: a GameCompletion is
 * the tally, and a tally that carries 353 unlocks is not a tally. Anything that
 * only wants the numbers reads `completion` and is unaffected by the rest.
 */
export interface GameTallyDto {
  readonly completion: GameCompletionDto;
  /**
   * Unlocked achievements only — one per unlock the tally counted, dated ones
   * earliest first and undated ones last.
   */
  readonly unlocks: readonly UnlockDto[];
}
