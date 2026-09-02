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
 * What the completion route answers: the tally, and the dates the unlocks it
 * counted happened on.
 *
 * Two named parts rather than a wider GameCompletionDto: a GameCompletion is
 * the tally, and a tally that carries 353 dates is not a tally. Anything that
 * only wants the numbers reads `completion` and is unaffected by the rest.
 */
export interface GameTallyDto {
  readonly completion: GameCompletionDto;
  /** Epoch seconds, unlocked achievements only, ascending. */
  readonly unlockedAt: readonly number[];
}
