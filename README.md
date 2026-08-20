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

L'app lit encore des fixtures locales, au format exact que le backend sert.

```bash
pnpm install
pnpm fixtures:build          # requis une fois — génère apps/mobile/src/fixtures/
pnpm --filter @steam/mobile start
```

Puis `w` pour ouvrir dans un navigateur, ou scanner le QR code avec Expo Go.

`fixtures/steam-raw/` et `apps/mobile/src/fixtures/` sont hors du dépôt : ils
contiennent des données de profil personnelles. Sans eux, l'app ne compile pas —
lancez `pnpm fixtures:build`, ou `pnpm --filter @steam/spike spike` pour
récupérer d'abord les données brutes (voir `tools/steam-spike/.env.example`).

## Vérifier

```bash
pnpm test                            # domaine, api, mobile
pnpm --filter @steam/mobile typecheck
pnpm --filter @steam/mobile exec expo export --platform ios   # valide le bundle natif
```

Les tests du domaine et de l'api tournent sous Vitest ; ceux de l'app sous
`jest-expo`, seul capable de transpiler les sources Flow de React Native.
