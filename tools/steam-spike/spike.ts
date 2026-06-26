import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import "dotenv/config";

const KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;
const APPID = process.env.STEAM_APPID;

if (!KEY || !STEAM_ID || !APPID) {
  console.error("Variables manquantes. Copie .env.example vers .env et remplis-le.");
  process.exit(1);
}

const OUT_DIR = resolve(process.cwd(), "../../fixtures/steam-raw");

const endpoints: Record<string, string> = {
  "player-summaries":
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${KEY}&steamids=${STEAM_ID}`,
  "owned-games":
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true&format=json`,
  [`schema-for-game-${APPID}`]:
    `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${KEY}&appid=${APPID}&l=french`,
  [`player-achievements-${APPID}`]:
    `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${APPID}&key=${KEY}&steamid=${STEAM_ID}&l=french`,
};

async function run(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  for (const [name, url] of Object.entries(endpoints)) {
    process.stdout.write(`→ ${name} ... `);
    const res = await fetch(url);
    const text = await res.text();

    let pretty = text;
    try {
      pretty = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      // réponse non-JSON (ex. profil privé renvoie parfois du HTML/erreur) : on garde le brut
    }

    const file = resolve(OUT_DIR, `${name}.json`);
    await writeFile(file, pretty, "utf8");
    console.log(`${res.status} → ${file}`);
  }
}

run().catch((err) => {
  console.error("Échec du spike :", err);
  process.exit(1);
});
