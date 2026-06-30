import { type Achievement } from "./achievement";
import { CompletionRate } from "./completion-rate";

export interface GameCompletion {
  readonly unlocked: number;
  readonly total: number;
  readonly rate: CompletionRate;
}

export const computeGameCompletion = (
  achievements: readonly Achievement[],
): GameCompletion => {
  const total = achievements.length;
  const unlocked = achievements.filter((a) => a.unlockState.unlocked).length;
  return { unlocked, total, rate: CompletionRate.from(unlocked, total) };
};
