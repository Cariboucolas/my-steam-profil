import { type SteamId } from "./steam-id";

export interface Profile {
  readonly steamId: SteamId;
  readonly personaName: string;
  readonly avatarUrl: string;
  readonly profileUrl: string;
}
