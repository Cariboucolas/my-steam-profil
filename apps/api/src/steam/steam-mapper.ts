import {
  SteamId,
  Playtime,
  unlockStateFromSteam,
  computeGameCompletion,
  buildTimeline,
  type Profile,
  type Game,
  type Achievement,
  type GameCompletion,
  type TimelineEntry,
  type Result,
  ok,
  err,
} from "@steam/domain";
import {
  type SteamPlayerSummariesResponse,
  type SteamOwnedGamesResponse,
  type SteamSchemaResponse,
  type SteamPlayerAchievementsResponse,
} from "./steam-types";

export type MapProfileError = "NOT_FOUND" | "INVALID_STEAM_ID";

export const mapProfile = (
  raw: SteamPlayerSummariesResponse,
): Result<Profile, MapProfileError> => {
  const player = raw.response.players[0];
  if (!player) return err("NOT_FOUND");

  const steamId = SteamId.create(player.steamid);
  if (!steamId.ok) return err("INVALID_STEAM_ID");

  return ok({
    steamId: steamId.value,
    personaName: player.personaname,
    avatarUrl: player.avatarfull,
    profileUrl: player.profileurl,
  });
};

const ICON_BASE =
  "https://media.steampowered.com/steamcommunity/public/images/apps";

export const mapGames = (raw: SteamOwnedGamesResponse): Game[] => {
  const ownedGames = raw.response.games ?? [];
  return ownedGames.map((ownedGame) => ({
    appId: ownedGame.appid,
    name: ownedGame.name,
    playtime: Playtime.fromMinutes(ownedGame.playtime_forever),
    iconUrl: `${ICON_BASE}/${ownedGame.appid}/${ownedGame.img_icon_url}.jpg`,
  }));
};

export interface GameAchievements {
  readonly completion: GameCompletion;
  readonly achievements: Achievement[];
  readonly timeline: TimelineEntry[];
}

export type AchievementsError = "PRIVATE_PROFILE" | "NO_ACHIEVEMENTS";

export const mapGameAchievements = (
  schema: SteamSchemaResponse,
  player: SteamPlayerAchievementsResponse,
): Result<GameAchievements, AchievementsError> => {
  const schemaAchievements = schema.game.availableGameStats?.achievements ?? [];
  if (schemaAchievements.length === 0) return err("NO_ACHIEVEMENTS");

  // Index player unlocks by apiname for the join (schema.name === player.apiname).
  const unlockByApiName = new Map(
    (player.playerstats.achievements ?? []).map((unlock) => [
      unlock.apiname,
      unlock,
    ]),
  );

  const achievements: Achievement[] = schemaAchievements.map((definition) => {
    const unlock = unlockByApiName.get(definition.name);
    return {
      apiName: definition.name,
      displayName: definition.displayName,
      description: definition.description ?? "",
      hidden: definition.hidden === 1,
      icon: definition.icon,
      iconGray: definition.icongray,
      unlockState: unlockStateFromSteam(
        unlock?.achieved ?? 0,
        unlock?.unlocktime ?? 0,
      ),
    };
  });

  return ok({
    completion: computeGameCompletion(achievements),
    achievements,
    timeline: buildTimeline(achievements),
  });
};
