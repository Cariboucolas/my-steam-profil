const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * For as long as the backend holds a tally (ADR-0005), which is the answer the
 * library asks for most. Nothing is said of how long an entry nobody watches
 * stays in memory: the library's default.
 */
const FOR_FIVE_MINUTES = { staleTime: FIVE_MINUTES_MS } as const;

/**
 * Asked every time and kept for nobody: the game view is not cached
 * (ADR-0005).
 */
const NEVER_CACHED = { staleTime: 0, gcTime: 0 } as const;

/**
 * The same for every player and slow to change (ADR-0008): fresh for as long
 * as the app runs, and kept even while no screen shows it.
 */
const FOR_THE_SESSION = { staleTime: Infinity, gcTime: Infinity } as const;

/**
 * Every query the app makes: the key its answer is kept under, and how long
 * that answer is fresh (#162). A query function is added where the query is
 * used, by whoever holds the `ApiClient`.
 *
 * What is the player's carries their SteamId, so a new Profile starts from
 * empty entries and cannot read another's. Rarity and achievement names carry
 * none: every player reads the same answer, and a new Profile keeps it.
 */
export const queries = {
  profile: (steamId: string) =>
    ({ queryKey: ["profile", steamId], ...FOR_FIVE_MINUTES }) as const,

  games: (steamId: string) =>
    ({ queryKey: ["games", steamId], ...FOR_FIVE_MINUTES }) as const,

  tally: (steamId: string, appId: number) =>
    ({ queryKey: ["tally", steamId, appId], ...FOR_FIVE_MINUTES }) as const,

  progress: (steamId: string, appId: number) =>
    ({ queryKey: ["progress", steamId, appId], ...NEVER_CACHED }) as const,

  rarity: (appId: number) =>
    ({ queryKey: ["rarity", appId], ...FOR_THE_SESSION }) as const,

  achievementNames: (appId: number) =>
    ({ queryKey: ["achievementNames", appId], ...FOR_THE_SESSION }) as const,
};
