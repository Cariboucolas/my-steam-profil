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
