import type { GameRarityDto } from "@steam/contracts";

import { buildRarestUnlocks, nameUnlocks, type NamedUnlock } from "../view-models/rarest-unlocks";
import { unlockingLibrary } from "./library";
import { STORY_TODAY } from "./today";

const ELDEN_RING = 1245620;

/** A handful of the fixture player's unlocks, ranked by what Steam publishes for them. */
const RARITY: GameRarityDto = [
  { apiName: "ACH_10_0", rarity: 0.4 },
  { apiName: "ACH_4_0", rarity: 3.25 },
];

const [rarest] = buildRarestUnlocks(
  unlockingLibrary(STORY_TODAY, new Date(2026, 5, 1, 12)),
  { [ELDEN_RING]: RARITY },
).rows;

if (!rarest) {
  throw new Error("The rarest fixture ranks nothing: its rarity no longer names an unlock.");
}

const namedAs = (names: Parameters<typeof nameUnlocks>[1], pending: boolean): NamedUnlock => {
  const [row] = nameUnlocks([rarest], names, new Set(pending ? [ELDEN_RING] : []));
  if (!row) throw new Error("nameUnlocks dropped the row it was handed.");
  return row;
};

/** Ranked and named: the game has said what it calls it. */
export const namedRarest: NamedUnlock = namedAs(
  { [ELDEN_RING]: [{ apiName: rarest.apiName, displayName: "Elden Lord", icon: "" }] },
  false,
);

/** Ranked, and its game has yet to answer what it is called (#57). */
export const rarestAwaitingItsName: NamedUnlock = namedAs({}, true);

/** Its game answered and named nothing for it, so the row keeps its key (#57). */
export const rarestKnownByItsKey: NamedUnlock = namedAs({ [ELDEN_RING]: [] }, false);
