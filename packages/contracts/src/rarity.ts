/**
 * One Achievement's Rarity over the wire: the share of the Game's owners who
 * have unlocked it, as Steam publishes it.
 *
 * Named by its apiName rather than carrying the Achievement itself, because the
 * call that produces it never fetches the schema — there is no display name
 * here, and deliberately so: the schema is the heavy payload ADR-0005 removed
 * from the library's hot path.
 */
export interface AchievementRarityDto {
  /** Unique within its Game, and only within it. */
  readonly apiName: string;
  /** 0 to 100, Steam's own figure and Steam's own rounding. Lower is rarer. */
  readonly rarity: number;
}

/**
 * What Steam publishes about one Game's Achievements.
 *
 * An Achievement Steam publishes no figure for is absent, and a Game it
 * publishes nothing about is an empty list — never a list of zeroes, which
 * would rank every one of them the rarest thing the player owns.
 */
export type GameRarityDto = readonly AchievementRarityDto[];
