/**
 * A Game as it travels over the wire. Playtime is carried twice on purpose:
 * the raw minutes so clients can sort, and the label so every client formats
 * playtime the same way.
 */
export interface GameDto {
  readonly appId: number;
  readonly name: string;
  readonly playtimeMinutes: number;
  readonly playtimeLabel: string;
  readonly iconUrl: string;
}
