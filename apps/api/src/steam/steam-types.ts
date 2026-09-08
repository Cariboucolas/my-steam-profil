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
  /** Epoch seconds; 0 when the player never launched the game. */
  rtime_last_played?: number;
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

/**
 * One Achievement's published share of owners, as `GetGlobalAchievementPercentagesForApp`
 * gives it: 0 to 100, Steam's own base, rounded by Steam to one decimal.
 *
 * `percent` is a **string** — `"93.9"`, not `93.9` — on every entry of every
 * response measured. Steam is alone in doing this here; the other calls send
 * their numbers as numbers.
 */
export interface SteamGlobalAchievementPercentage {
  name: string;
  percent: string;
}

/**
 * A game Steam publishes no figures for answers 403 with a bare `{}`, so the
 * envelope itself can be missing — not merely the list inside it.
 */
export interface SteamGlobalAchievementPercentagesResponse {
  achievementpercentages?: {
    achievements?: SteamGlobalAchievementPercentage[];
  };
}
