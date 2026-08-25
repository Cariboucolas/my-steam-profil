# A game outside the library is refused by the app, not by the API

`GET /api/profile/:steamId/games/:appId/progress` does not check that the player owns the game.
It answers for whatever appId it is given, and a game nobody owns comes back the same way a game
with nothing to earn does: 200, with an empty GameProgress.

The refusal user story 17 of #2 asked for lives in the app instead. The game screen loads the
library before it loads progress — it needs the Game's name, cover and playtime to draw its
header — so by the time it could ask for progress it already knows whether the appId is in the
library, and refuses on its own when it is not.

## Considered options

**Checking ownership in the route** was the faithful reading of story 17, and it is what issue #3
was opened to weigh. Rejected on cost: the only way for the API to know what a player owns is
`GetOwnedGames`, which would add a third Steam call to the endpoint the app hits every time a
Game is opened, to answer a question the caller had already answered. The library payload is
164 KB for a 367-game account; spending it per game view to re-derive a fact the caller holds is
the wrong place to pay.

**Caching the library server-side** to make that check cheap was rejected for scope, not merit:
it decides caching for the whole API, and ADR-0005 settles that question on its own terms.

**Dropping story 17** was rejected because the behaviour it asks for exists — it just is not the
API's.

## Consequences

The API's contract is narrower than it looks: it reports on a *(player, game)* pair without
claiming the pair is real. A caller that has not checked ownership can be handed an empty
GameProgress for an appId the player has never owned, and cannot tell that from a game that
defines no achievements. Any second client would have to make the same check the app makes.

That check therefore has to stay honest. `apps/mobile/app/game/[appId].tsx` refuses an appId
absent from the library, and `fixture-api-client.ts` distinguishes `NOT_LOADED` from `NOT_FOUND`
on the same rule. Both are covered by tests, because this ADR is what makes them load-bearing
rather than defensive.

If a second client ever appears, revisit this: the argument rests entirely on the caller already
holding the library, and it stops holding the moment a caller does not.
