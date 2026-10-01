import type { AchievementDto, GameDto, GameProgressDto, GameRarityDto } from "@steam/contracts";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { unlockingLibrary } from "../fixtures/library";
import { STORY_TODAY } from "../fixtures/today";
import { translatorFor } from "../i18n/i18n";
import { messageFor, type ScreenError } from "./api-errors";
import {
  buildAchievementRows,
  buildFilterCounts,
  buildGameSummary,
  buildTimelineDays,
  filterLabel,
} from "./game-progress";
import { buildRarestUnlocks } from "./rarest-unlocks";
import { buildUnlockCalendar } from "./unlock-calendar";

const en = translatorFor("en");
const fr = translatorFor("fr");

const achievement = (
  apiName: string,
  unlockedAt: string | null,
  description = "",
): AchievementDto => ({
  apiName,
  displayName: apiName,
  description,
  hidden: false,
  icon: "https://icon/a.jpg",
  iconGray: "https://gray/a.jpg",
  unlocked: unlockedAt !== null,
  unlockedAt,
});

const PROGRESS: GameProgressDto = {
  completion: { unlocked: 2, total: 4, percentage: 50 },
  achievements: [
    achievement("A", "2026-06-24T22:09:00.000Z", "Do it."),
    achievement("B", "2026-06-24T20:08:00.000Z", "Do it again."),
    achievement("C", null, ""),
    achievement("D", null, "Hidden away."),
  ],
  timeline: [
    { apiName: "B", unlockedAt: "2026-06-24T20:08:00.000Z" },
    { apiName: "A", unlockedAt: "2026-06-24T22:09:00.000Z" },
  ],
};

const GAME: GameDto = {
  appId: 1,
  name: "Soulstone Survivors",
  playtimeMinutes: 4977,
  iconUrl: "https://icon/1.jpg",
  lastPlayedAt: "2026-06-25T12:16:14.000Z",
};

describe("French plurals, including the form only French has", () => {
  it.each([
    ["game.remaining", 0, "0 succès restant"],
    ["game.remaining", 1, "1 succès restant"],
    ["game.remaining", 2, "2 succès restants"],
    ["game.remaining", 1_000_000, "1000000 de succès restants"],
    ["game.unlockedOnDay", 1, "1 débloqué"],
    ["game.unlockedOnDay", 3, "3 débloqués"],
    ["profile.gameCount", 1, "1 jeu"],
    ["profile.gameCount", 367, "367 jeux"],
    ["profile.gameCount", 2_000_000, "2000000 de jeux"],
    ["rarest.ranked", 1, "1 plus rare parmi 5 jeux"],
    ["rarest.ranked", 10, "10 plus rares parmi 5 jeux"],
    ["rarest.ranked", 3_000_000, "3000000 plus rares parmi 5 jeux"],
    ["calendar.monthSpoken", 1, "mars, 1 succès débloqué"],
    ["calendar.monthSpoken", 4, "mars, 4 succès débloqués"],
    ["calendar.monthSpoken", 1_000_000, "mars, 1000000 de succès débloqués"],
  ])("%s for %d reads %j", (key, count, written) => {
    expect(fr(key, { count, counted: "5 jeux", month: "mars" })).toBe(written);
  });

  it("keeps English at one and other", () => {
    expect(en("game.remaining", { count: 1 })).toBe("1 achievement remaining");
    expect(en("game.remaining", { count: 2 })).toBe("2 achievements remaining");
  });
});

describe("the game screen's sentences", () => {
  it("writes the summary in French, a date in the French format", () => {
    const summary = buildGameSummary(GAME, PROGRESS, fr);

    expect(summary.meta).toBe("82 h 57 de jeu · dernière partie le 25 juin 2026");
    expect(summary.remaining).toBe("2 succès restants");
    expect(summary.lastUnlock).toBe("dernier succès le 24 juin 2026");
    expect(summary.fraction).toBe("2 / 4");
  });

  it("writes the same summary in English as before", () => {
    const summary = buildGameSummary(GAME, PROGRESS, en);

    expect(summary.meta).toBe("82 h 57 played · last played 25 Jun 2026");
    expect(summary.remaining).toBe("2 achievements remaining");
    expect(summary.lastUnlock).toBe("last unlock 24 Jun 2026");
  });

  it("says what is missing rather than a figure, in French", () => {
    const unloaded = buildGameSummary({ ...GAME, lastPlayedAt: null, playtimeMinutes: 0 }, null, fr);
    const none = buildGameSummary(GAME, { ...PROGRESS, completion: { unlocked: 0, total: 0, percentage: 0 } }, fr);

    expect(unloaded.fraction).toBe("non chargé");
    expect(unloaded.meta).toBe("0 min de jeu · jamais lancé");
    expect(none.fraction).toBe("aucun succès");
  });

  it("words the rows and the timeline in French", () => {
    const rows = buildAchievementRows(PROGRESS, "all", fr);
    const [evening] = buildTimelineDays(PROGRESS, fr);

    expect(rows.map((row) => row.dateLabel)).toEqual([
      "24 juin 2026",
      "24 juin 2026",
      "verrouillé",
      "verrouillé",
    ]);
    expect(rows.find((row) => row.apiName === "C")?.description).toBe(
      "Succès caché — aucune description",
    );
    expect(evening).toMatchObject({ day: "24 juin", year: "2026", countLabel: "2 débloqués" });
  });

  it("words the filter chips in French", () => {
    const counts = buildFilterCounts(PROGRESS);

    expect(filterLabel("all", counts, fr)).toBe("Tous 4");
    expect(filterLabel("unlocked", counts, fr)).toBe("Débloqués 2");
    expect(filterLabel("locked", counts, fr)).toBe("Verrouillés 2");
    expect(filterLabel("locked", counts, en)).toBe("Locked 2");
  });
});

describe("the rarest ranking", () => {
  const ELDEN_RING = 1245620;
  const view = unlockingLibrary(STORY_TODAY, new Date(2026, 5, 1, 12));
  const rarity = (figures: GameRarityDto) => ({ [ELDEN_RING]: figures });

  it("writes the decimal mark of the locale on a share of players", () => {
    const published: GameRarityDto = [
      { apiName: "ACH_10_0", rarity: 0.4 },
      { apiName: "ACH_4_0", rarity: 61.25 },
      { apiName: "ACH_5_0", rarity: 0.04 },
    ];

    const labelsIn = (t: typeof fr) =>
      buildRarestUnlocks(view, rarity(published), t).rows.map((row) => row.rarityLabel);

    expect(labelsIn(en)).toEqual(["<0.1%", "0.4%", "61.3%"]);
    expect(labelsIn(fr)).toEqual(["<0,1%", "0,4%", "61,3%"]);
  });

  it("says what it ranked across, in each language", () => {
    const published: GameRarityDto = [{ apiName: "ACH_10_0", rarity: 0.4 }];

    expect(buildRarestUnlocks(view, rarity(published), en).countedLabel).toBe(
      "rarest 1 across 1 game counted",
    );
    expect(buildRarestUnlocks(view, rarity(published), fr).countedLabel).toBe(
      "1 plus rare parmi 1 jeu comptabilisé",
    );
    expect(buildRarestUnlocks(view, {}, fr).countedLabel).toBe(
      "rien à classer parmi 0 jeu comptabilisé",
    );
  });
});

describe("the unlock calendar", () => {
  const calendarIn = (t: typeof fr) =>
    buildUnlockCalendar(unlockingLibrary(STORY_TODAY, new Date(2025, 0, 1, 12)), STORY_TODAY, t);

  it("takes its month labels from the catalog", () => {
    expect(calendarIn(en).months.map((month) => month.label).slice(0, 3)).toEqual(["JAN", "FEB", "MAR"]);
    expect(calendarIn(fr).months.map((month) => month.label).slice(0, 3)).toEqual(["JAN", "FÉV", "MAR"]);
  });

  it("keeps every French label inside the three characters the column is sized for", () => {
    const labels = Array.from({ length: 12 }, (_, month) => fr(`calendar.months.${month}`).toUpperCase());

    expect(labels.filter((label) => label.length > 3)).toEqual([]);
    expect(labels[7]).toBe("AOÛ");
  });

  it("names the months it speaks in full, in the language chosen", () => {
    expect(calendarIn(fr).months[0]?.screenReaderLabel).toMatch(/^janvier, \d+ succès débloqués?$/);
    expect(calendarIn(en).months[0]?.screenReaderLabel).toMatch(/^January, \d+ unlocks?$/);
  });

  it("writes the frame and the comparison in French", () => {
    const calendar = calendarIn(fr);

    expect(calendar.frameLabel).toBe(`ANNÉE ${STORY_TODAY.getFullYear()} · JAN → DÉC`);
    expect(calendar.deltaLabel).toMatch(/^[+-]?\d+ vs l'ensemble de \d{4} \(\d+\)$/);
    expect(calendarIn(en).frameLabel).toBe(`YEAR ${STORY_TODAY.getFullYear()} · JAN → DEC`);
  });
});

describe("failures", () => {
  const ALL: readonly ScreenError[] = [
    "INVALID_STEAM_ID",
    "NOT_FOUND",
    "PRIVATE_PROFILE",
    "NOT_LOADED",
    "UNAVAILABLE",
    "INVALID_GAME_ID",
    "NOT_IN_LIBRARY",
  ];

  it.each(ALL)("%s has a sentence of its own in French, other than the English one", (error) => {
    expect(messageFor(error, fr)).not.toBe(`errors.${error}`);
    expect(messageFor(error, fr)).not.toBe(messageFor(error, en));
  });
});

describe("view-models and the global i18n instance (ADR-0023)", () => {
  const sources = readdirSync(__dirname)
    .filter((file) => file.endsWith(".ts") && !/\.test(-support)?\.ts$/.test(file))
    .map((file) => [file, readFileSync(join(__dirname, file), "utf8")] as const);

  it("reads its translation function from its arguments, never from the module that holds the instance", () => {
    const importsTheInstance = sources
      .filter(([, source]) => /import\s+(?!type\b)[^;]*from "\.\.\/i18n\/i18n"/.test(source))
      .map(([file]) => file);

    expect(importsTheInstance).toEqual([]);
  });

  it("has no English default left on a translation-function parameter", () => {
    const hasDefault = sources
      .filter(([, source]) => /:\s*Translate\s*=/.test(source))
      .map(([file]) => file);

    expect(hasDefault).toEqual([]);
  });
});
