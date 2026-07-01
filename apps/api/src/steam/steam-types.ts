// Raw Steam Web API response shapes (only the fields we use).
// See tools/steam-spike/FINDINGS.md for the empirical contract.

export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
}

export interface SteamPlayerSummariesResponse {
  response: { players: SteamPlayerSummary[] };
}

export interface SteamOwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
}

export interface SteamOwnedGamesResponse {
  response: { game_count?: number; games?: SteamOwnedGame[] };
}

export interface SteamSchemaAchievement {
  name: string;
  displayName: string;
  description?: string;
  hidden: number;
  icon: string;
  icongray: string;
}

export interface SteamSchemaResponse {
  game: {
    gameName?: string;
    availableGameStats?: {
      achievements?: SteamSchemaAchievement[];
    };
  };
}

export interface SteamPlayerAchievement {
  apiname: string;
  achieved: number;
  unlocktime: number;
}

export interface SteamPlayerAchievementsResponse {
  playerstats: {
    success: boolean;
    error?: string;
    achievements?: SteamPlayerAchievement[];
  };
}
