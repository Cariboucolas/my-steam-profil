/**
 * An Achievement as it travels over the wire. UnlockState's two shapes collapse
 * into a boolean plus a nullable ISO 8601 date, since JSON has no union types
 * and no Date.
 */
export interface AchievementDto {
  readonly apiName: string;
  readonly displayName: string;
  readonly description: string;
  readonly hidden: boolean;
  readonly icon: string;
  readonly iconGray: string;
  readonly unlocked: boolean;
  readonly unlockedAt: string | null;
}
