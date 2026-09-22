# my-steam-profil

[![CI](https://github.com/Cariboucolas/my-steam-profil/actions/workflows/ci.yml/badge.svg)](https://github.com/Cariboucolas/my-steam-profil/actions/workflows/ci.yml)

Application mobile (Expo / React Native / TypeScript) autour des succès Steam.
Architecture hexagonale, monorepo pnpm. Voir `docs/superpowers/` (local) pour le design.

## Vérifier

```bash
pnpm test                            # domaine, api, mobile
pnpm --filter @steam/mobile typecheck
pnpm --filter @steam/mobile exec expo export --platform ios   # valide le bundle natif
```

Les tests du domaine et de l'api tournent sous Vitest ; ceux de l'app sous
`jest-expo`, seul capable de transpiler les sources Flow de React Native.

Ces trois commandes sont exactement celles que la CI exécute — dans cet ordre — sur chaque
pull request et sur chaque push vers `main` :

```bash
pnpm typecheck    # les 6 paquets du workspace
pnpm test         # 224 tests : domaine, api, mobile
pnpm build:web    # construit le bundle web, pour prouver qu'il se construit
```

Le job s'appelle `verify` et il est **obligatoire** avant merge : `main` n'accepte que le
rebase-merge, et seulement depuis une branche à jour et verte. Node vient de `.nvmrc`, pnpm du
champ `packageManager` — la CI ne peut donc pas tourner sur d'autres versions que les tiennes.
