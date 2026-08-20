# my-steam-profil

Application mobile (Expo / React Native / TypeScript) autour des succès Steam.
Architecture hexagonale, monorepo pnpm. Voir `docs/superpowers/` (local) pour le design.

## Structure

| Paquet | Rôle |
|---|---|
| `packages/domain` | Le domaine : SteamId, Playtime, CompletionRate, Timeline… Aucune I/O. |
| `packages/contracts` | Les DTO « fil » partagés entre le backend et l'app. |
| `apps/api` | Proxy Steam (ADR-0001) : trois endpoints, mappers et presenters. |
| `apps/mobile` | L'app Expo : écrans Library et Game. |
| `tools/steam-spike` | Récupère les réponses brutes de Steam dans `fixtures/steam-raw/`. |
| `tools/fixtures-dto` | Transforme ces réponses brutes en DTO pour l'app. |

## Démarrer le backend

```bash
cp apps/api/.env.example apps/api/.env   # puis renseigner STEAM_API_KEY
pnpm dev:api                             # http://localhost:3000
```

Le serveur lit `apps/api/.env` s'il existe, sinon l'environnement du processus —
ce qui laisse un déploiement fournir ses variables à sa façon. Il écoute sur
toutes les interfaces, donc un téléphone du même réseau peut le joindre.

Trois endpoints, les seuls que l'app appelle :

| Endpoint | Réponse |
|---|---|
| `GET /api/profile/:steamId` | `ProfileDto` — 404 si le profil est introuvable |
| `GET /api/profile/:steamId/games` | `GameDto[]` — liste vide si le compte ne possède rien |
| `GET /api/profile/:steamId/games/:appId/progress` | `GameProgressDto` — 403 si le profil est privé, 200 vide si le jeu n'a pas de succès |

Plus `GET /health`. Un SteamID mal formé donne 400 sans qu'aucun appel ne parte
vers Steam ; une panne Steam donne 502, un bug de notre côté donne 500.

La clé API ne quitte jamais le serveur (ADR-0001) et n'apparaît ni dans une
réponse ni dans un message d'erreur.

## Démarrer l'app

L'app parle au backend. Lancez-le d'abord, puis :

```bash
cp apps/mobile/.env.example apps/mobile/.env   # puis renseigner EXPO_PUBLIC_STEAM_ID
pnpm --filter @steam/mobile start
```

Puis `w` pour ouvrir dans un navigateur, ou scanner le QR code avec Expo Go.

Sur téléphone, `localhost` désigne le téléphone lui-même : mettez l'adresse LAN
de votre machine dans `EXPO_PUBLIC_API_URL` (par exemple
`http://192.168.1.10:3000`). Le backend écoute déjà sur toutes les interfaces.

Expo charge `apps/mobile/.env` tout seul, mais **substitue les `EXPO_PUBLIC_*` au
moment du bundle** : après avoir modifié le fichier, redémarrez le serveur de
développement. Au démarrage, il affiche `env: export EXPO_PUBLIC_...` — si une
variable n'y figure pas, elle n'atteindra pas l'app.

Si l'écran affiche « No Steam profile to show », c'est que `EXPO_PUBLIC_STEAM_ID`
ne contient pas un SteamID64 (dix-sept chiffres) — et non que le backend est
injoignable.

**Expo Go** : le Play Store sert une version figée au SDK 54 et ne se mettra pas
à jour. Installez le client courant depuis les releases officielles —
`api.expo.dev/v2/versions/latest` pointe vers `github.com/expo/expo-go-releases`.

### Travailler sans backend

`tools/fixtures-dto` génère des fixtures au format DTO, et
`createFixtureApiClient` les sert. L'app ne s'en sert plus par défaut, mais le
chemin reste ouvert :

```bash
pnpm fixtures:build          # génère apps/mobile/src/fixtures/
```

`fixtures/steam-raw/` et `apps/mobile/src/fixtures/` sont hors du dépôt : ils
contiennent des données de profil personnelles. `pnpm --filter @steam/spike spike`
récupère les données brutes (voir `tools/steam-spike/.env.example`).

## Vérifier

```bash
pnpm test                            # domaine, api, mobile
pnpm --filter @steam/mobile typecheck
pnpm --filter @steam/mobile exec expo export --platform ios   # valide le bundle natif
```

Les tests du domaine et de l'api tournent sous Vitest ; ceux de l'app sous
`jest-expo`, seul capable de transpiler les sources Flow de React Native.
