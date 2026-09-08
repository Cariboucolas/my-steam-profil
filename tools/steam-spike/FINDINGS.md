# Observations API Steam (spike du 2026-06-23 / 24)

SteamID de test : `76561197979269357` — jeu : Halls of Torment (`2218750`), langue `&l=french`.

## GetPlayerSummaries (profil)
- Chemin : `response.players[0]`
- Champs utiles : `steamid` (string), `personaname`, `avatar` / `avatarmedium` / `avatarfull` (URLs complètes),
  `avatarhash`, `profileurl`, `communityvisibilitystate` (**3 = public**), `profilestate`,
  `timecreated` (epoch s), `lastlogoff` (epoch s), `loccountrycode`, `locstatecode`.
- Pour le domaine `Profile` (MVP) : `steamid`, `personaname`, `avatarfull`, `profileurl`.
- ⚠️ **`communityvisibilitystate` n'indique PAS l'accès aux succès** : un profil aux détails de jeu privés
  renvoie quand même `communityvisibilitystate: 3` ici. La seule vérité = la réponse de `GetPlayerAchievements` (403).

## GetOwnedGames (jeux)
- Chemin : `response.games[]` ; total dans `response.game_count` (367 ici).
- Champs : `appid` (number), `name`, `playtime_forever` (**minutes**), `img_icon_url` (**hash**, pas une URL),
  `has_community_visible_stats` (**boolean** — signal « ce jeu a des succès/stats »),
  `rtime_last_played` (epoch s), `playtime_windows/mac/linux/deck_forever`, `content_descriptorids[]`.
- Reconstruction de l'icône : `https://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{img_icon_url}.jpg`
- Pour le domaine `Game` (MVP) : `appid`, `name`, `playtime_forever`, `img_icon_url` (+ appid pour l'URL).

## GetSchemaForGame (définitions des succès — ce qui EXISTE)
- Chemin : `game.availableGameStats.achievements[]` ; aussi `game.gameName`, `game.gameVersion`.
- ⚠️ **`availableGameStats` contient DEUX tableaux** : `stats[]` (statistiques de jeu, à IGNORER)
  **et** `achievements[]` (les succès, à UTILISER). Attention à ne pas compter les `stats` comme des succès :
  pour Soulstone Survivors, 38 stats + 483 succès = 521 `defaultvalue`. Compter via `achievements[]` uniquement.
- Champs par succès : `name` (**clé/apiName**), `displayName`, `description`, `hidden` (**0/1**),
  `icon` (URL couleur), `icongray` (URL grisée), `defaultvalue` (0).
- Cas « jeu sans succès » (2694490) : le schéma renvoie **`{ "game": {} }`** — objet `game` vide,
  **aucun `availableGameStats`**. C'est le marqueur fiable « ce jeu n'a pas de succès » côté schéma.

## GetPlayerAchievements (déblocages du joueur — ce que TU as)
- Chemin : `playerstats.achievements[]` ; aussi `playerstats.steamID`, `playerstats.gameName`.
- Champs par succès : `apiname` (**clé**), `achieved` (**0/1**), `unlocktime` (**epoch secondes**, 0 si verrouillé),
  `name`, `description` (localisés).
- **Jeu 100 % (Halls of Torment, 2218750)** : 500 succès, tous `achieved: 1`. Cas « complétion totale ».
- **Jeu partiel (Soulstone Survivors, 2066020)** : 483 succès au schéma, **353 `achieved: 1`**,
  **130 `achieved: 0`** (avec `unlocktime: 0`), dont **9 cachés** (`hidden: 1`). Cas « complétion partielle » + verrouillés.
  → Jointure parfaite : 483 (schéma) = 353 + 130 (joueur).
- **`playerstats.success` (boolean)** est la sentinelle : `true` = données exploitables ; `false` = rien.
- **Lancé sans rien débloquer (25900)** : HTTP 200, `success: true`, tous `achieved: 0` (64/64 verrouillés).
- **Jamais lancé (978520)** : HTTP 200, `success: true`, tous `achieved: 0` (24/24). **Indistinguable** du cas
  précédent via cette API → côté domaine c'est juste une complétion `0/N` (croiser `playtime_forever` si distinction voulue).
- **Jeu sans succès (2694490)** : **HTTP 400** + corps `{ "playerstats": { "error": "Requested app has no stats", "success": false } }`.
- **Profil privé (détails de jeu)** : **HTTP 403** + corps `{ "playerstats": { "error": "Profile is not public", "success": false } }`.
  → À distinguer du « jeu sans succès » : **403 privé** vs **400 sans-stats**, messages différents.

## GetGlobalAchievementPercentagesForApp (rareté — ce que TOUT LE MONDE a)
_(mesuré le 2026-09-08, pas pendant le spike initial)_
- Chemin : `achievementpercentages.achievements[]`. Paramètre : **`gameid`** (pas `appid` — seul appel à le nommer ainsi).
- ⚠️ **Aucune clé API requise** : l'endpoint répond à `?gameid=` seul. C'est le seul appel du service dans ce cas.
- ⚠️ **`percent` est une CHAÎNE**, pas un nombre : `{"name":"ReachExperienceLevel5","percent":"93.9"}`.
  483/483 entrées sur 2066020. Les autres appels envoient leurs nombres comme des nombres ; celui-ci non.
- Arrondi Steam à une décimale → **les ex æquo sont fréquents et réels** : sur 2066020, `62.9`, `53.4`, `53.0`,
  `52.1`, `49.7` apparaissent chacun deux fois. Un classement qui coupe entre deux valeurs égales coupe sur du bruit.
- **Jeu sans chiffres publiés** : **HTTP 403** + corps **`{}` nu** — pas d'enveloppe `achievementpercentages` du tout.
  Vérifié sur 2694490 (jeu sans succès), 24400 et 999999999 (appid inexistant) : les trois répondent 403 `{}`.
  → À distinguer des autres appels, qui disent « pas de stats » avec un **400**. Ici c'est un **403**.
- Aucun `percent` à `0` observé sur 2066020 ; un zéro publié resterait néanmoins un chiffre mesuré par Steam.
- Poids : ~20 Ko pour 483 succès, contre 253,8 Ko pour le schéma du même jeu.

## Décisions de modélisation qui en découlent
1. **Clé de jointure schéma ↔ déblocage** : `schema.name === player.apiname` (noms de champ différents !).
   Le backend fusionne et expose un seul `apiName` côté domaine.
2. **Normalisation 0/1 → boolean** : `achieved`, `hidden` deviennent des booléens dans le domaine.
3. **`unlocktime` (secondes) → `Date`** : multiplier par 1000. `UnlockState` :
   `achieved=1` → `{ unlocked: true, at: new Date(unlocktime*1000) }` ; sinon `{ unlocked: false }`.
4. **Données d'affichage** (`displayName`, `description`, `icon`, `icongray`, `hidden`) : viennent du **schéma**.
   `icon` (succès débloqué) vs `icongray` (verrouillé).
5. **`GameCompletion`** : `total` = nombre de succès du **schéma** ; `unlocked` = nombre d'`achieved=1`.
   Le schéma est la source de vérité du total (règle de design confirmée).
6. **`playtime_forever`** est en minutes → `Playtime` le stocke en minutes, l'affiche en heures.
7. **Détection « jeu sans succès »** : s'appuyer sur `has_community_visible_stats` (owned-games)
   et/ou `availableGameStats` absent (schema).

## Fixtures capturées
- [x] Jeu **100 %** — Halls of Torment (2218750), 500/500.
- [x] Jeu **partiellement complété** — Soulstone Survivors (2066020), 353/483, 130 verrouillés, 9 cachés.
- [x] Jeu **lancé sans déblocage** — King's Bounty (25900), 0/64.
- [x] Jeu **jamais lancé** — Legend of Keepers (978520), 0/24.
- [x] Jeu **sans succès** — (2694490), schéma `{ "game": {} }` + HTTP 400 `"Requested app has no stats"`.
- [x] Réponse **profil privé** — HTTP 403 `"Profile is not public"` (capturée via un profil tiers privé).
