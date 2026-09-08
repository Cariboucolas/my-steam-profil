import type { UnlockDto } from "./game-progress";

/**
 * The order a GameTally carries its unlocks in: dated ones earliest first, and
 * the ones Steam will not date last.
 *
 * Exported beside the shape it orders because it is part of that shape's
 * contract. Every producer of a tally must satisfy it — the Worker mapping
 * Steam's answer, and the fixture client answering the same shape from stored
 * progress — and a rule written in prose in one place and implemented in two is
 * a rule that ends up implemented differently in two.
 *
 * An undated unlock has no place on the scale the others share, so it is put
 * where it states nothing rather than at a date it never happened on.
 */
export const byWhenUnlocked = (a: UnlockDto, b: UnlockDto): number => {
  if (a.at === null) return b.at === null ? 0 : 1;
  if (b.at === null) return -1;
  return a.at - b.at;
};
