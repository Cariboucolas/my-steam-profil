# my-steam-profil

[![CI](https://github.com/Cariboucolas/my-steam-profil/actions/workflows/ci.yml/badge.svg)](https://github.com/Cariboucolas/my-steam-profil/actions/workflows/ci.yml)

Application mobile (Expo / React Native / TypeScript) autour des succès Steam.
Architecture hexagonale, monorepo pnpm. Voir `docs/superpowers/` (local) pour le design.

## En production

| Quoi | Où | Déployé par |
|---|---|---|
| Le site | https://steam-achievements-czo.pages.dev | Cloudflare Pages |
| L'API | https://steam-achievements-api.cdcraft.workers.dev | Cloudflare Workers |
| L'app Android | canal EAS `preview` | EAS Update, en OTA |

Chaque merge sur `main` déploie les trois et publie une [Release](https://github.com/Cariboucolas/my-steam-profil/releases)
qui redonne ces adresses. Vérifier qu'un merge est bien arrivé jusqu'au bout :

```bash
gh release view --web                                    # la dernière release
curl -s "$(gh variable get API_URL)/health"
```

Le projet Pages s'appelle `steam-achievements`, mais son adresse est
`steam-achievements-czo.pages.dev` : le **nom** d'un projet est unique par compte, son
**sous-domaine** l'est mondialement, et le court était déjà pris. `--project-name` dans
`deploy.yml` suit le nom, jamais l'adresse — les lire comme une seule et même chose est une
erreur facile, et elle coûte un déploiement.

`STEAM_API_KEY` vit à deux endroits et nulle part ailleurs : un secret GitHub, et un secret
Worker que le déploiement repose à chaque fois depuis le premier. Elle n'est dans aucun fichier
du dépôt et dans aucun bundle livré (ADR-0001, ADR-0003).

Quand une requête échoue, le Worker écrit une entrée dans Workers Logs — actif depuis le
premier déploiement — qui dit **de quelle révision** elle vient, quelle route, et à qui la
faute : Steam, ou nous. Le commit arrive par `wrangler deploy --var COMMIT_SHA`, jamais
dans `wrangler.jsonc`, qui serait périmé dès le commit suivant. Sous `wrangler dev`, la
ligne dit `dev`, comme l'app (ADR-0016).

Le site déployé ne contient **aucun** SteamID : le build de production force
`EXPO_PUBLIC_STEAM_ID` à vide — explicitement, et non en comptant sur son absence — donc l'app
demande quel profil afficher, ce qui la rend utilisable par n'importe qui.

Les alertes Sentry arrivent dans un serveur Discord dédié, par `apps/alerts` — un troisième
Worker, qui vérifie la signature de Sentry et traduit son JSON en message Discord. Il existe
parce que l'intégration Discord native de Sentry demande un plan payant — comme l'*alert rule
action* qu'une intégration personnalisée exposerait sinon — là où l'abonnement au webhook
`issue` est gratuit mais parle une langue que Discord refuse. Seule l'action `created` réveille :
`resolved`, `assigned` et le reste arrivent au même endroit et sont écartés par le pont. **Rien ne
surveille ce Worker** : s'il cesse de transmettre, le silence ressemble à celui d'un système
qui va bien. C'est la limite connue d'ADR-0018, écrite plutôt que dissimulée.

Ce que les deux cibles publiées rapportent quand elles cassent va au projet Sentry
`cdcraft/steam-achievements`, sous la révision qu'elles affichent déjà. Le DSN est une
*variable* et non un secret — un DSN client voyage dans le bundle par construction — et
`deploy.yml` refuse de builder sans lui, parce qu'un bundle de production aveugle ressemble
exactement à un bundle qui marche. Le vider est l'interrupteur, comme `EAS_ENABLED`. Ce qui
part, et ce qui ne part pas : ADR-0017. Le secret `SENTRY_AUTH_TOKEN` ne sert qu'à téléverser
les source maps, sans lesquelles une pile minifiée ne se lit pas.

**Sur téléphone**, le workflow `EAS Update` publie sur le canal `preview` à chaque merge. Il
reste gardé par la variable `EAS_ENABLED` : la passer à autre chose que `true` arrête les
publications sans qu'il faille toucher au workflow — un interrupteur, pas une salle d'attente.
Le projet Expo est `@cariboucolas/steam-achievements` ; son `projectId` et son `updates.url`
sont dans `app.json`, et le robot token dans le secret `EXPO_TOKEN`.

Ensuite il y a une étape humaine, et une seule. Un update EAS ne se charge **pas dans
Expo Go** : il faut un build qui embarque `expo-updates`. On le fabrique une fois :

```bash
cd apps/mobile
eas build --profile preview --platform android   # ~15 à 20 min, chez Expo
```

Le build se termine par un lien et un QR code : l'ouvrir depuis le téléphone et installer
l'APK. **Cette attente n'a lieu qu'une fois.** Ensuite, l'app installée se met à jour toute
seule au lancement qui suit un merge — Expo télécharge l'update en arrière-plan au premier
lancement et l'applique au suivant. Reconstruire un APK n'est nécessaire que si une dépendance
native change, c'est-à-dire si `runtimeVersion` change.

iOS sur appareil réel est hors périmètre : il exige le programme Apple Developer (99 $/an).
Le site déployé couvre la vérification visuelle en attendant.

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
