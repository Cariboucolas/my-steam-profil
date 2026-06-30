import { type UnlockState } from "./unlock-state";

export interface Achievement {
  readonly apiName: string; // clé Steam (schema.name === player.apiname)
  readonly displayName: string;
  readonly description: string;
  readonly hidden: boolean;
  readonly icon: string; // icône couleur (débloqué)
  readonly iconGray: string; // icône grisée (verrouillé)
  readonly unlockState: UnlockState;
}
