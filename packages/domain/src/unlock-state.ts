export type UnlockState =
  | { readonly unlocked: true; readonly at: Date }
  | { readonly unlocked: false };

export const locked: UnlockState = { unlocked: false };

export const unlockedAt = (at: Date): UnlockState => ({ unlocked: true, at });

/**
 * Traduit la paire Steam (achieved 0/1, unlocktime en secondes) en UnlockState.
 * Règle (cf. FINDINGS.md) : débloqué ssi achieved === 1 ET unlocktime > 0.
 */
export const unlockStateFromSteam = (
  achieved: number,
  unlocktime: number,
): UnlockState => {
  if (achieved === 1 && unlocktime > 0) {
    return unlockedAt(new Date(unlocktime * 1000));
  }
  return locked;
};
