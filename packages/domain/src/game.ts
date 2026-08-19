import { type Playtime } from "./playtime";

export interface Game {
  readonly appId: number;
  readonly name: string;
  readonly playtime: Playtime;
  readonly iconUrl: string;
  /** When the player last launched it, or null if they never have. */
  readonly lastPlayed: Date | null;
}
