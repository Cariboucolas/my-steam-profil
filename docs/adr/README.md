# Architecture decisions

Every decision that shaped this codebase, oldest first, with what it settled and what it amends.

Each ADR states its decision and holds its own reasoning; chronology is a property of the set
rather than of any one of them, so it lives here and the ADRs keep their current shape. A later
decision never rewrites an earlier one — it amends it, and both say so.

| # | Date | Decision | What it settled |
|---|---|---|---|
| [0001](0001-backend-proxies-steam.md) | 2026-08-18 | The backend proxies Steam | The app never talks to Steam and never holds the API key. Every Steam shape stops at our boundary. |
| [0002](0002-result-for-expected-failures.md) | 2026-08-18 | `Result` for expected failures | A failure the caller must act on is a value, not an exception. Exceptions are for what nobody planned for. |
| [0003](0003-api-runs-on-cloudflare-workers.md) | 2026-08-24 | The API runs on Cloudflare Workers | Where the API lives, and that platform knowledge stays in `worker.ts` rather than spreading into routes. |
| [0004](0004-the-app-refuses-a-game-outside-the-library.md) | 2026-08-25 | The app refuses a game outside the library | Ownership is checked by the caller that already knows, not by a route that would have to ask Steam again. |
| [0005](0005-the-library-tally-is-cached-the-game-view-is-not.md) | 2026-08-25 | The library tally is cached, the game view is not | One Steam call per tally, cached five minutes; the game view stays live, because that is where a fresh unlock is checked. |
| [0006](0006-the-tally-carries-its-unlock-dates.md) | 2026-09-02 | The tally carries its unlock dates | The completion route answers `{ completion, unlockedAt }`, on the download ADR-0005 was already making. **Amends 0005.** |
