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
    tabs: {
      completion: "Completion",
      rarest: "Rarest",
    },
    sorts: {
      completed: "Completed first",
      recent: "Recently played",
      playtime: "Most played",
    },
    withheld: {
      playtime: "Steam does not publish this profile's playtime",
      lastPlayed: "Steam does not publish when this profile last played",
      privacy: "if it is yours, open Steam's privacy settings",
    },
    statsCard: {
      caption: "achievements\nunlocked",
      ring: "COMPLETED",
      perfectGames: "perfect games",
      played: "played",
      gamesOwned: "games owned",
    },
  },
  rarest: {
    ofPlayers: "of players",
    ranked_one: "rarest {{count}} across {{counted}}",
    ranked_other: "rarest {{count}} across {{counted}}",
    nothingToRank: "nothing to rank across {{counted}}",
    counting: {
      title: "Counting your library first",
      hint: "the rarest unlocks are ranked across every game you have played",
    },
    loading: "Ranking what you have unlocked",
    unpublished: {
      title: "Nothing here Steam publishes a figure for",
      hint: "a rarity we do not hold is not a rarity of zero",
    },
    none: "Nothing unlocked in any game yet",
  },
  game: {
    tabs: {
      achievements: "Achievements",
      timeline: "Timeline",
    },
    filters: {
      all: "All {{count}}",
      unlocked: "Unlocked {{count}}",
      locked: "Locked {{count}}",
    },
    hiddenDescription: "Hidden achievement — no description",
    locked: "locked",
    unlockedOnDay_one: "{{count}} unlocked",
    unlockedOnDay_other: "{{count}} unlocked",
    played: "{{time}} played",
    lastPlayed: "last played {{day}}",
    lastPlayedNever: "last played never",
    notLoaded: "not loaded",
    remaining_one: "{{count}} achievement remaining",
    remaining_other: "{{count}} achievements remaining",
    lastUnlock: "last unlock {{day}}",
    empty: {
      notLoaded: "Achievements not loaded for this game",
      notLoadedHint: "the schema and your unlocks load on first open",
      noAchievements: "This game has no achievements",
      nothingUnlocked: "Nothing unlocked yet",
    },
    back: "Back to library",
  },
  calendar: {
    title: "Activity",
    // Three capitals fit the label column (ADR-0011); the row upper-cases them.
    months: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
    monthNames: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    monthSpoken_one: "{{month}}, {{count}} unlock",
    monthSpoken_other: "{{month}}, {{count}} unlocks",
    frame: "YEAR {{year}} · {{first}} → {{last}}",
    delta: "{{signed}} vs all of {{year}} ({{total}})",
    halves: {
      first: "First half of the year",
      second: "Second half of the year",
    },
  },
  errors: {
    INVALID_STEAM_ID: "The backend refused this Steam ID. Try a different profile.",
    NOT_FOUND: "Steam has no profile with that ID.",
    PRIVATE_PROFILE: "This profile is private, so Steam will not say what has been unlocked.",
    NOT_LOADED: "Achievements have not been loaded for this game yet.",
    UNAVAILABLE: "Could not reach the backend. Check that it is running, then try again.",
    INVALID_GAME_ID: "That is not a game id.",
    NOT_IN_LIBRARY: "This game is not in the library.",
    retry: "Try again",
    changeProfile: "Change profile",
  },
  profile: {
    // "1 games" is what the header has always written; #157 translates and does not reword.
    gameCount_one: "{{count}} games",
    gameCount_other: "{{count}} games",
    revision: "· revision {{revision}}",
    change: "Change",
  },
  form: {
    title: "Which Steam profile?",
    hint: "A SteamID64 — seventeen digits.",
    input: "SteamID64",
    refused: "That is not a SteamID64. It is seventeen digits — find yours at steamid.io.",
    submit: "Show this profile",
    cancel: "Cancel",
    forget: "Forget this profile",
  },
  loading: "Loading",
  setup: {
    language: "Language",
  },
};
