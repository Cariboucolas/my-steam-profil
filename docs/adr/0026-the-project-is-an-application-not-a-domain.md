# The project is an application, not a domain
Measured against a three-level scale — 1 a showcase, 2 an application, 3 a business domain — this
codebase is at level 2, and stays there until one of the signals below appears. This records
what the code already is; it moves no file.

The scale, so the level means something:

| Level | Front | Back |
| --- | --- | --- |
| 1 — showcase | plain components | none, or isolated functions |
| 2 — application | the five atomic levels | layers: routes → services → repositories |
| 3 — domain | the five atomic levels | DDD and hexagonal: domain ← use cases ← adapters |

## What the code is
**The front is level 2, and already says so.** `apps/mobile/src/components/` holds `atoms/`,
`molecules/`, `organisms/`, `templates/` and `pages/`; only a page loads what it shows
(ADR-0022), loading lives in hooks under `src/api-client/`, and `pnpm check:stories` keeps every
level below pages in the gallery.

**The back is level 2, with the layers named after what they hold.** `apps/api` reads Steam and
stores nothing. A route in `src/http/app.ts` validates its input into domain values, calls the
`SteamGateway` interface (`src/steam/steam-gateway.ts`), and has `src/steam/steam-mapper.ts` turn
Steam's shapes into ours. The gateway stands where a repository would — the one seam a test
replaces — and the mapper where a service would. There is no separate service layer: the
handlers in `app.ts` do the little orchestration there is. `apps/alerts` is a bridge of three
files under the same rule.

**`packages/domain` borrows from level 3 without being it.** It imports no framework, its values
validate themselves (`SteamId`, `CompletionRate`, `Playtime`), failures are values (ADR-0002),
and `CONTEXT.md` names what it holds. There are no use cases, no aggregate guarding a rule across
several values, no workflow and no second context: what the product does is read a public profile
and show it. The README's "hexagonal architecture" describes that one port, not a level-3 back.

## The rule
- A change stays within level 2: no use-case layer, no aggregate, no bounded context added ahead
  of the need.
- The project moves to level 3 when one of these appears, by an ADR that amends this one:
  a rule that two routes or two screens enforce each in their own way; an invariant spanning
  several values that nothing but care protects; a write to state the project owns — an account,
  a sign-in (#97), a stored preference on the server; a second subdomain with a vocabulary
  `CONTEXT.md` cannot hold alongside the first.
- Back to level 1 is not on the table while there is an API at all.

## What this does not say
It does not ask for a service layer in `apps/api`: there is no logic for one to hold, and adding
it would be a file between two files. It does not rename the gateway a repository. And it binds
the shape of new code, not a refactoring of the old.
