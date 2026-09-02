import {
  SteamId,
  Playtime,
  unlockStateFromSteam,
  computeGameCompletion,
  CompletionRate,
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
  type SteamPlayerAchievement,
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

const SECONDS_TO_MS = 1000;

const ICON_BASE =
  "https://media.steampowered.com/steamcommunity/public/images/apps";

/** Steam sends epoch seconds, and 0 for a game that was never launched. */
const lastPlayedFromSteam = (seconds: number | undefined): Date | null =>
  seconds ? new Date(seconds * SECONDS_TO_MS) : null;

export const mapGames = (raw: SteamOwnedGamesResponse): Game[] => {
  const ownedGames = raw.response.games ?? [];
  return ownedGames.map((ownedGame) => ({
    appId: ownedGame.appid,
    name: ownedGame.name,
    playtime: Playtime.fromMinutes(ownedGame.playtime_forever),
    iconUrl: `${ICON_BASE}/${ownedGame.appid}/${ownedGame.img_icon_url}.jpg`,
    lastPlayed: lastPlayedFromSteam(ownedGame.rtime_last_played),
  }));
};

export interface GameProgress {
  readonly completion: GameCompletion;
  readonly achievements: Achievement[];
  readonly timeline: TimelineEntry[];
}

export type AchievementsError = "PRIVATE_PROFILE" | "NO_ACHIEVEMENTS";

/**
 * What the library is told about one game: the tally, and the dates the
 * unlocks it counted happened on.
 *
 * The dates sit beside the GameCompletion rather than inside it. A
 * GameCompletion is three numbers; the same three numbers plus 353 dates is a
 * different thing, and giving it the tally's name would make every reader of a
 * tally carry a payload they have no use for (ADR-0006).
 */
export interface GameTally {
  readonly completion: GameCompletion;
  /** Epoch seconds, unlocked achievements only, ascending. */
  readonly unlockedAt: readonly number[];
}

/**
 * Steam refuses the player call in two very different ways and says which only
 * in a prose message: the profile is private, or the game keeps no stats. Both
 * arrive as `success: false`, so the two readings are told apart here and
 * nowhere else — every caller of the player response goes through this.
 */
const refusalIn = (
  player: SteamPlayerAchievementsResponse,
): AchievementsError | null => {
  if (player.playerstats.success) return null;
  const message = player.playerstats.error ?? "";
  return message.includes("not public") ? "PRIVATE_PROFILE" : "NO_ACHIEVEMENTS";
};

/**
 * Steam flags an achievement earned and dates it at the epoch often enough to
 * matter: that is Steam saying it does not know when, not a January morning in
 * 1970. The player still has it, so it stays in the tally; a calendar has
 * nothing to draw, so it is left out of the dates. The domain draws the same
 * line in `unlockStateFromSteam`.
 */
const unlockedOn = (entry: SteamPlayerAchievement): boolean =>
  entry.achieved === 1 && entry.unlocktime > 0;

/**
 * How far a player has got in a game and when they got there, counted without
 * asking what the game defines. Steam answers the player call with the full
 * achievement list, each entry flagged for this player and dated, so both are
 * already there — and the schema call, which is the larger of the two
 * payloads, is not needed at all.
 *
 * This is what lets the library ask about every game it owns for one Steam call
 * apiece instead of two (ADR-0005), and the dates ride along on a download
 * already made (ADR-0006).
 */
export const mapGameTally = (
  player: SteamPlayerAchievementsResponse,
): Result<GameTally, AchievementsError> => {
  const refusal = refusalIn(player);
  if (refusal) return err(refusal);

  const achievements = player.playerstats.achievements ?? [];
  if (achievements.length === 0) return err("NO_ACHIEVEMENTS");

  const unlocked = achievements.filter((entry) => entry.achieved === 1).length;
  return ok({
    completion: {
      unlocked,
      total: achievements.length,
      rate: CompletionRate.from(unlocked, achievements.length),
    },
    // Sorted here rather than by every reader in turn: Steam sends the
    // achievements in whatever order the game defines them.
    unlockedAt: achievements
      .filter(unlockedOn)
      .map((entry) => entry.unlocktime)
      .sort((a, b) => a - b),
  });
};

export const mapGameProgress = (
  schema: SteamSchemaResponse,
  player: SteamPlayerAchievementsResponse,
): Result<GameProgress, AchievementsError> => {
  const refusal = refusalIn(player);
  if (refusal) return err(refusal);

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
