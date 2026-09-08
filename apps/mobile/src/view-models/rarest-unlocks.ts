import type { GameDto, GameRarityDto, UnlockDto } from "@steam/contracts";

import { gamesCounted, type LibraryView } from "./library";

/**
 * What Steam publishes about each game, keyed by appId. A game absent has not
 * been asked about yet; a game present with an empty list is one Steam
 * publishes nothing about. Neither can be ranked, and the difference belongs to
 * whoever is doing the asking.
 */
export type RarityByAppId = Readonly<Record<number, GameRarityDto>>;

/**
 * One line of the ranking, decided here and drawn as it stands. Named for what
 * it is rather than for the row that draws it, as an UnlockMonth is.
 */
export type RarestUnlock = {
  readonly appId: number;
  /** Which game this came from — across a library, that is what places it. */
  readonly gameName: string;
  /**
   * Unique within its game, and only within it. No display name: naming an
   * achievement needs the schema, which is the heavy payload ADR-0005 keeps
   * out of the library's path and which only the games shown here will pay.
   */
  readonly apiName: string;
  readonly rarity: number;
  /** The figure as the row writes it — `0.4%`, never `0%` of something held. */
  readonly rarityLabel: string;
};

export type RarestUnlocks = {
  /** Rarest first, and never longer than the ties at the cut make it. */
  readonly rows: readonly RarestUnlock[];
  /**
   * What was ranked and what it was ranked across — `rarest 10 across 214
   * games counted`. A library holds games nobody publishes figures for, and a
   * ranking that did not say so would read as the whole library's answer.
   */
  readonly countedLabel: string;
};

/**
 * How many rows the tab shows before ties extend it. Ten is a list a reader
 * takes in at once, and the eleventh rarest thing in a library is not what the
 * tab was opened for.
 */
const ROWS = 10;

/** One candidate row, with the date the cut and the ties are decided on. */
type Candidate = RarestUnlock & { readonly at: number | null };

/**
 * At most one decimal, and the trailing zero dropped — `12%`, `0.4%`, as every
 * other rate on this screen is written. A figure that rounds to nothing is
 * written as under a tenth rather than as zero: the player is holding the
 * achievement, so "0%" of them would be a plain untruth.
 */
const rarityLabelOf = (rarity: number): string => {
  const rounded = Math.round(rarity * 10) / 10;
  return rounded === 0 ? "<0.1%" : `${rounded}%`;
};

/**
 * An unlock Steam will not date has no day to be placed by, and sorts as older
 * than any day there is — which puts it behind its dated equals rather than at
 * either end of a scale Steam refused to place it on. Epoch seconds are never
 * negative, so nothing real can reach this.
 */
const NEVER_DATED_LAST = -1;

const whenOf = (candidate: Candidate): number => candidate.at ?? NEVER_DATED_LAST;

/**
 * Rarest first; among equals the newest unlock first, since Steam's rounding
 * makes real ties and the newest trophy is the one worth leading with.
 *
 * The last two comparisons decide nothing a reader would notice and everything
 * a rebuild would: the same inputs must give the same order, and two unlocks
 * can be equal on both a figure and a day.
 */
const byRarestThenNewest = (a: Candidate, b: Candidate): number => {
  if (a.rarity !== b.rarity) return a.rarity - b.rarity;

  const [when, otherWhen] = [whenOf(a), whenOf(b)];
  // Reversed, because the newer unlock leads among equals.
  if (when !== otherWhen) return otherWhen - when;

  if (a.appId !== b.appId) return a.appId - b.appId;
  return a.apiName < b.apiName ? -1 : 1;
};

/**
 * The unlocks of one game that Steam publishes a figure for. An unlock with no
 * published figure is dropped rather than given one: a Rarity we do not hold is
 * not a Rarity of zero, which would rank it the rarest thing in the library.
 *
 * Only unlocks are looked at at all, so a locked achievement — however rare —
 * cannot reach the ranking. This tab is what the player has actually earned.
 */
const candidatesIn = (
  game: GameDto,
  unlocks: readonly UnlockDto[],
  published: GameRarityDto,
): readonly Candidate[] => {
  const rarityOf = new Map(published.map((one) => [one.apiName, one.rarity]));

  return unlocks.flatMap((unlock) => {
    const rarity = rarityOf.get(unlock.apiName);
    if (rarity === undefined) return [];
    return [
      {
        appId: game.appId,
        gameName: game.name,
        apiName: unlock.apiName,
        rarity,
        rarityLabel: rarityLabelOf(rarity),
        at: unlock.at,
      },
    ];
  });
};

/**
 * The ten rarest, and everything the tenth is tied with. Steam rounds to one
 * decimal, so the tenth and the eleventh can be published at exactly the same
 * figure, and cutting between two identical values is the one place this
 * ranking can mislead without anyone noticing.
 *
 * The tie is read off the label rather than off the figure behind it: what a
 * reader can see is what they would notice being cut. The two agree on
 * everything Steam has ever been measured sending, and where they would not,
 * the label is the honest one.
 */
const topWithItsTies = (ranked: readonly Candidate[]): readonly Candidate[] => {
  const last = ranked[ROWS - 1];
  if (!last) return ranked;
  return ranked.filter(
    (one, index) => index < ROWS || one.rarityLabel === last.rarityLabel,
  );
};

const labelFor = (rows: number, counted: number): string =>
  rows === 0
    ? `nothing to rank across ${gamesCounted(counted)}`
    : `rarest ${rows} across ${gamesCounted(counted)}`;

/**
 * The rarest achievements this player has actually unlocked, rarest first,
 * ready to draw: every decision the tab makes is made here, so the components
 * that draw it decide nothing.
 *
 * Reads the same LibraryView the rows and the summary are built from, plus what
 * came back from the rarity route — which knows no player, and so cannot be
 * asked this question on its own.
 *
 * Pure: no clock and no network. It is rebuilt on every wave of answers, and a
 * ranking that moved under the reader between two identical loads would be a
 * different answer to the same question.
 */
export const buildRarestUnlocks = (
  view: LibraryView,
  rarity: RarityByAppId,
): RarestUnlocks => {
  const ranked: Candidate[] = [];
  let counted = 0;

  for (const game of view.games) {
    const tally = view.tallies[game.appId];
    const published = rarity[game.appId];
    // A game still being counted, or one Steam publishes nothing about, is not
    // a game this ranking has ranked across, and says so by not counting it.
    if (!tally || !published || published.length === 0) continue;

    counted += 1;
    ranked.push(...candidatesIn(game, tally.unlocks, published));
  }

  const rows = topWithItsTies([...ranked].sort(byRarestThenNewest)).map(
    ({ at: _at, ...row }) => row,
  );

  return { rows, countedLabel: labelFor(rows.length, counted) };
};
