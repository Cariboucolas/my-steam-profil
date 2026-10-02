import { queries } from "./queries";

const ONE = "76561197979269357";
const OTHER = "76561198000000000";
const APP_ID = 620;
const FIVE_MINUTES_MS = 300_000;

describe("queries (keys)", () => {
  /** A new Profile starts from empty entries and cannot read another's (#162). */
  it.each([
    ["profile", (steamId: string) => queries.profile(steamId)],
    ["games", (steamId: string) => queries.games(steamId)],
    ["tally", (steamId: string) => queries.tally(steamId, APP_ID)],
    ["progress", (steamId: string) => queries.progress(steamId, APP_ID)],
  ])("keeps the %s of two profiles apart", (_kind, query) => {
    expect(query(ONE).queryKey).not.toEqual(query(OTHER).queryKey);
    expect(query(ONE).queryKey).toEqual(query(ONE).queryKey);
  });

  /** The answer is the same for every player, so a new Profile keeps it (ADR-0008). */
  it.each([
    ["rarity", queries.rarity],
    ["achievementNames", queries.achievementNames],
  ])("names no profile in the key of %s", (_kind, query) => {
    const key = JSON.stringify(query(APP_ID).queryKey);

    expect(key).not.toContain(ONE);
    expect(query(APP_ID).queryKey).not.toEqual(query(APP_ID + 1).queryKey);
  });

  it("keeps two games of one profile apart", () => {
    expect(queries.tally(ONE, APP_ID).queryKey).not.toEqual(
      queries.tally(ONE, APP_ID + 1).queryKey,
    );
    expect(queries.progress(ONE, APP_ID).queryKey).not.toEqual(
      queries.progress(ONE, APP_ID + 1).queryKey,
    );
  });

  it("keeps the kinds apart", () => {
    const keys = [
      queries.profile(ONE),
      queries.games(ONE),
      queries.tally(ONE, APP_ID),
      queries.progress(ONE, APP_ID),
      queries.rarity(APP_ID),
      queries.achievementNames(APP_ID),
    ].map((query) => JSON.stringify(query.queryKey));

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("queries (freshness)", () => {
  /** The backend's own duration (ADR-0005). */
  it.each([
    ["profile", queries.profile(ONE)],
    ["games", queries.games(ONE)],
    ["tally", queries.tally(ONE, APP_ID)],
  ])(
    "holds the %s fresh for five minutes, kept as long as the library keeps anything",
    (_kind, query) => {
      expect(query.staleTime).toBe(FIVE_MINUTES_MS);
      expect(query).not.toHaveProperty("gcTime");
    },
  );

  /** The game view is not cached (ADR-0005). */
  it("never serves progress from the cache", () => {
    expect(queries.progress(ONE, APP_ID)).toMatchObject({ staleTime: 0, gcTime: 0 });
  });

  it.each([
    ["rarity", queries.rarity(APP_ID)],
    ["achievementNames", queries.achievementNames(APP_ID)],
  ])("keeps %s for the whole session", (_kind, query) => {
    expect(query).toMatchObject({ staleTime: Infinity, gcTime: Infinity });
  });
});
