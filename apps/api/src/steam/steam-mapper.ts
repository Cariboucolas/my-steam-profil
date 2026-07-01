import { SteamId, Playtime, type Profile, type Game, type Result, ok, err } from "@steam/domain";
import {
  type SteamPlayerSummariesResponse,
  type SteamOwnedGamesResponse,
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
  const games = raw.response.games ?? [];
  return games.map((g) => ({
    appId: g.appid,
    name: g.name,
    playtime: Playtime.fromMinutes(g.playtime_forever),
    iconUrl: `${ICON_BASE}/${g.appid}/${g.img_icon_url}.jpg`,
  }));
};
