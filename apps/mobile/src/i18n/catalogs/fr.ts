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
    tabs: {
      completion: "Complétion",
      rarest: "Plus rares",
    },
    sorts: {
      completed: "Terminés d'abord",
      recent: "Joués récemment",
      playtime: "Plus joués",
    },
    withheld: {
      playtime: "Steam ne publie pas le temps de jeu de ce profil",
      lastPlayed: "Steam ne publie pas la date de dernière partie de ce profil",
      privacy: "si c'est le vôtre, ouvrez les paramètres de confidentialité de Steam",
    },
    statsCard: {
      caption: "succès\ndébloqués",
      ring: "COMPLÉTÉ",
      perfectGames: "jeux à 100 %",
      played: "joué",
      gamesOwned: "jeux possédés",
    },
  },
  rarest: {
    ofPlayers: "des joueurs",
    ranked_one: "{{count}} plus rare parmi {{counted}}",
    ranked_many: "{{count}} plus rares parmi {{counted}}",
    ranked_other: "{{count}} plus rares parmi {{counted}}",
    nothingToRank: "rien à classer parmi {{counted}}",
    counting: {
      title: "Comptage de votre bibliothèque d'abord",
      hint: "les succès les plus rares sont classés parmi tous les jeux auxquels vous avez joué",
    },
    loading: "Classement de vos succès débloqués",
    unpublished: {
      title: "Steam ne publie aucun chiffre pour ces jeux",
      hint: "une rareté que nous n'avons pas n'est pas une rareté de zéro",
    },
    none: "Aucun succès débloqué pour l'instant",
  },
  game: {
    tabs: {
      achievements: "Succès",
      timeline: "Chronologie",
    },
    filters: {
      all: "Tous {{count}}",
      unlocked: "Débloqués {{count}}",
      locked: "Verrouillés {{count}}",
    },
    hiddenDescription: "Succès caché — aucune description",
    locked: "verrouillé",
    unlockedOnDay_one: "{{count}} débloqué",
    unlockedOnDay_many: "{{count}} de débloqués",
    unlockedOnDay_other: "{{count}} débloqués",
    played: "{{time}} de jeu",
    lastPlayed: "dernière partie le {{day}}",
    lastPlayedNever: "jamais lancé",
    notLoaded: "non chargé",
    remaining_one: "{{count}} succès restant",
    remaining_many: "{{count}} de succès restants",
    remaining_other: "{{count}} succès restants",
    lastUnlock: "dernier succès le {{day}}",
    empty: {
      notLoaded: "Succès non chargés pour ce jeu",
      notLoadedHint: "le schéma et vos succès se chargent à la première ouverture",
      noAchievements: "Ce jeu n'a aucun succès",
      nothingUnlocked: "Rien de débloqué pour l'instant",
    },
    back: "Retour à la bibliothèque",
  },
  calendar: {
    title: "Activité",
    // Three capitals fit the label column (ADR-0011); the row upper-cases them.
    months: [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
      "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
    ],
    monthNames: [
      "janvier", "février", "mars", "avril", "mai", "juin",
      "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ],
    monthSpoken_one: "{{month}}, {{count}} succès débloqué",
    monthSpoken_many: "{{month}}, {{count}} de succès débloqués",
    monthSpoken_other: "{{month}}, {{count}} succès débloqués",
    frame: "ANNÉE {{year}} · {{first}} → {{last}}",
    delta: "{{signed}} contre l'ensemble de {{year}} ({{total}})",
    halves: {
      first: "Première moitié de l'année",
      second: "Seconde moitié de l'année",
    },
  },
  errors: {
    INVALID_STEAM_ID: "Le serveur a refusé cet identifiant Steam. Essayez un autre profil.",
    NOT_FOUND: "Steam n'a aucun profil avec cet identifiant.",
    PRIVATE_PROFILE: "Ce profil est privé : Steam ne dira pas ce qui a été débloqué.",
    NOT_LOADED: "Les succès de ce jeu n'ont pas encore été chargés.",
    UNAVAILABLE: "Impossible de joindre le serveur. Vérifiez qu'il tourne, puis réessayez.",
    INVALID_GAME_ID: "Ce n'est pas un identifiant de jeu.",
    NOT_IN_LIBRARY: "Ce jeu n'est pas dans la bibliothèque.",
    retry: "Réessayer",
    changeProfile: "Changer de profil",
  },
  profile: {
    gameCount_one: "{{count}} jeu",
    gameCount_many: "{{count}} de jeux",
    gameCount_other: "{{count}} jeux",
    revision: "· révision {{revision}}",
    change: "Changer",
  },
  form: {
    title: "Quel profil Steam ?",
    hint: "Un SteamID64 — dix-sept chiffres.",
    input: "SteamID64",
    refused: "Ce n'est pas un SteamID64. Il compte dix-sept chiffres — trouvez le vôtre sur steamid.io.",
    submit: "Afficher ce profil",
    cancel: "Annuler",
    forget: "Oublier ce profil",
  },
  loading: "Chargement",
  setup: {
    language: "Langue",
  },
};
