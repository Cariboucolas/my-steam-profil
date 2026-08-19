# my-steam-profil

Application mobile (Expo / React Native / TypeScript) autour des succès Steam.
Architecture hexagonale, monorepo pnpm. Voir `docs/superpowers/` (local) pour le design.

## Structure

| Paquet | Rôle |
|---|---|
| `packages/domain` | Le domaine : SteamId, Playtime, CompletionRate, Timeline… Aucune I/O. |
| `packages/contracts` | Les DTO « fil » partagés entre le backend et l'app. |
| `apps/api` | Proxy Steam (ADR-0001). Mappers et presenters faits, serveur HTTP à venir. |
| `apps/mobile` | L'app Expo : écrans Library et Game. |
| `tools/steam-spike` | Récupère les réponses brutes de Steam dans `fixtures/steam-raw/`. |
| `tools/fixtures-dto` | Transforme ces réponses brutes en DTO pour l'app. |

## Démarrer l'app

Le backend HTTP n'existe pas encore : l'app lit des fixtures locales, au format
exact que le backend servira.

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
