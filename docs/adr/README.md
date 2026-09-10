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
| [0007](0007-the-tone-scale-reads-a-rolling-year.md) | 2026-09-04 | The tone scale reads a rolling year, the header reads calendar years | The calendar's five tone bands are quartiles of the player's active days over the 365 days ending today, not of the year drawn. |
| [0008](0008-rarity-is-cached-long-and-shared.md) | 2026-09-08 | Rarity is cached long and shared | A game's published rarity is kept a day under an address carrying no SteamId. Contradicts 0005 in appearance only: nothing player-specific sits under a shared key. **Extended 2026-09-09**: how a game names its achievements falls under the same rule. |
| [0009](0009-the-tally-names-its-unlocks.md) | 2026-09-08 | The tally names its unlocks | The completion route answers `{ completion, unlocks }`, each unlock named and dated or undated. A rarity is published per achievement, so a date alone cannot be crossed with it. **Amends 0006.** |
| [0010](0010-the-app-chooses-its-language.md) | 2026-09-10 | The app chooses its language, the device does not | Wording, dates and number separators come from the language the app displays, never from the device's locale. A string's width is a layout input, so the app picks its characters. |
| [0011](0011-a-figure-shortens-only-when-it-must.md) | 2026-09-10 | A figure shortens only when it must | The library headline is written in the most informative form that fits the room the screen leaves it, measured rather than thresholded. Binds `UnlockHeadline` alone for now. |
| [0012](0012-a-promise-to-hold-text-caps-how-far-it-grows.md) | 2026-09-10 | A promise to hold text caps how far it grows | A box that must hold its text caps the system text size, by a multiplier derived from its own constraint. The headline and its caption stop at 1.13; the calendar's month column opts out. **Amends 0011.** |
