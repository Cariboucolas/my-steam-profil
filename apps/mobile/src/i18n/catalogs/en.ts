import type { Catalog } from "./catalog";

/**
 * Plural keys carry one form per category English needs, `one` and `other`.
 * The catalogs' parity test holds French to the same keys (ADR-0023).
 */
export const en: Catalog = {
  format: {
    // Grouping is left off on purpose: `formatNumber` groups with a plain space (ADR-0011).
    number: "{{value, number}}",
  },
  date: {
    day: "{{day}} {{month}} {{year}}",
    months: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
  },
  library: {
    minutes: "{{minutes}} min",
    hours: "{{hours}} h",
    neverPlayed: "never played",
    noAchievements: "no achievements",
    gamesCounted_one: "{{count}} game counted",
    gamesCounted_other: "{{count}} games counted",
    unlockedSpoken_one: "{{formatted}} achievement unlocked",
    unlockedSpoken_other: "{{formatted}} achievements unlocked",
    fraction: "{{unlocked}} / {{total}} across {{counted}}",
    statsCard: {
      caption: "achievements\nunlocked",
      ring: "LIBRARY",
      perfectGames: "perfect games",
      played: "played",
      gamesOwned: "games owned",
    },
  },
  setup: {
    language: "Language",
  },
};
