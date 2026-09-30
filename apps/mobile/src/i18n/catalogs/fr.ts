import type { Catalog } from "./catalog";

/** French needs `many` beside `one` and `other`: a count in millions takes "de". */
export const fr: Catalog = {
  format: {
    number: "{{value, number}}",
  },
  date: {
    day: "{{day}} {{month}} {{year}}",
    months: [
      "janv.", "févr.", "mars", "avr.", "mai", "juin",
      "juil.", "août", "sept.", "oct.", "nov.", "déc.",
    ],
  },
  library: {
    minutes: "{{minutes}} min",
    hours: "{{hours}} h",
    neverPlayed: "jamais lancé",
    noAchievements: "aucun succès",
    gamesCounted_one: "{{count}} jeu comptabilisé",
    gamesCounted_many: "{{count}} de jeux comptabilisés",
    gamesCounted_other: "{{count}} jeux comptabilisés",
    unlockedSpoken_one: "{{formatted}} succès débloqué",
    unlockedSpoken_many: "{{formatted}} de succès débloqués",
    unlockedSpoken_other: "{{formatted}} succès débloqués",
    fraction: "{{unlocked}} / {{total}} sur {{counted}}",
    statsCard: {
      caption: "succès\ndébloqués",
      ring: "COMPLÉTÉ",
      perfectGames: "jeux à 100 %",
      played: "joué",
      gamesOwned: "jeux possédés",
    },
  },
  setup: {
    language: "Langue",
  },
};
