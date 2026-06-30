import { type UnlockState } from "./unlock-state";

export interface Achievement {
  readonly apiName: string; // Steam key (schema.name === player.apiname)
  readonly displayName: string;
  readonly description: string;
  readonly hidden: boolean;
  readonly icon: string; // colored icon (unlocked)
  readonly iconGray: string; // greyed icon (locked)
  readonly unlockState: UnlockState;
}
