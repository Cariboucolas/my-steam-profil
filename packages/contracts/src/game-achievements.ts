/**
 * What a Game calls one of its Achievements, with no player in it: the half of
 * a row that Steam's published figures cannot supply.
 *
 * Three fields where the schema has seven. `description` and `hidden` belong to
 * a screen that lists what a Game asks of you; a ranked row shows a name over a
 * game name and an icon, and nothing else. The schema is the 253 KB payload
 * ADR-0005 keeps out of the library's path, so what is forwarded from it —
 * and kept for a day under a shared key — is only what a row is drawn with.
 */
export interface AchievementNameDto {
  /** Unique within its Game, and only within it. Joins to a Rarity and to an Unlock. */
  readonly apiName: string;
  readonly displayName: string;
  /** The unlocked icon. These rows are unlocks, so the grey one names nothing. */
  readonly icon: string;
}

/**
 * How one Game names every Achievement it defines.
 *
 * A Game that defines none is an empty list, exactly as a Game Steam publishes
 * no figures for is: both are true answers, and neither is a failure.
 */
export type GameAchievementsDto = readonly AchievementNameDto[];
