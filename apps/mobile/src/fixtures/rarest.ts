import type { GameRarityDto } from "@steam/contracts";

import type { Translate } from "../i18n/i18n";
import { buildRarestUnlocks, nameUnlocks, type NamedUnlock } from "../view-models/rarest-unlocks";
import { unlockingLibrary } from "./library";
import { STORY_TODAY } from "./today";

const ELDEN_RING = 1245620;

/** A handful of the fixture player's unlocks, ranked by what Steam publishes for them. */
const RARITY: GameRarityDto = [
  { apiName: "ACH_10_0", rarity: 0.4 },
  { apiName: "ACH_4_0", rarity: 3.25 },
];

/** The fixture player's rarest unlock, ranked and worded in the language `t` is bound to. */
const rarestIn = (t: Translate) => {
  const [rarest] = buildRarestUnlocks(
    unlockingLibrary(STORY_TODAY, new Date(2026, 5, 1, 12)),
    { [ELDEN_RING]: RARITY },
    t,
  ).rows;

  if (!rarest) {
    throw new Error("The rarest fixture ranks nothing: its rarity no longer names an unlock.");
  }
  return rarest;
};

const namedAs = (
  t: Translate,
  names: Parameters<typeof nameUnlocks>[1],
  pending: boolean,
): NamedUnlock => {
  const [row] = nameUnlocks([rarestIn(t)], names, new Set(pending ? [ELDEN_RING] : []));
  if (!row) throw new Error("nameUnlocks dropped the row it was handed.");
  return row;
};

/** The three states a ranked row can be in, worded in the language `t` is bound to. */
export const rarestRowsIn = (t: Translate) => ({
  /** Ranked and named: the game has said what it calls it. */
  named: namedAs(
    t,
    { [ELDEN_RING]: [{ apiName: rarestIn(t).apiName, displayName: "Elden Lord", icon: "" }] },
    false,
  ),
  /** Ranked, and its game has yet to answer what it is called (#57). */
  awaitingItsName: namedAs(t, {}, true),
  /** Its game answered and named nothing for it, so the row keeps its key (#57). */
  knownByItsKey: namedAs(t, { [ELDEN_RING]: [] }, false),
});
