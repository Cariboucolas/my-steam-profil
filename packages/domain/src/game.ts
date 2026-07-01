import { type Playtime } from "./playtime";

export interface Game {
  readonly appId: number;
  readonly name: string;
  readonly playtime: Playtime;
  readonly iconUrl: string;
}
