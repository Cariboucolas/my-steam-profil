import { translatorFor, type Translate } from "../i18n/i18n";
import {
  buildLibrarySummary,
  formatDay,
  formatHoursRounded,
  formatUnlockHeadline,
  gamesCounted,
  type LibraryView,
} from "./library";

const en = translatorFor("en");
const fr = translatorFor("fr");

describe("a view-model given a translation function", () => {
  it("writes each language's text for the same input", () => {
    expect(gamesCounted(3, en)).toBe("3 games counted");
    expect(gamesCounted(3, fr)).toBe("3 jeux comptabilisés");
    expect(formatDay("2026-06-25T12:00:00Z", en)).toBe("25 Jun 2026");
    expect(formatDay("2026-06-25T12:00:00Z", fr)).toBe("25 juin 2026");
  });

  it("calls the function it was given and nothing else", () => {
    const calls: string[] = [];
    const stub = ((key: string) => {
      calls.push(key);
      return `«${key}»`;
    }) as unknown as Translate;

    expect(gamesCounted(2, stub)).toBe("«library.gamesCounted»");
    expect(formatHoursRounded(30, stub)).toBe("«library.minutes»");
    expect(calls).toEqual(["library.gamesCounted", "library.minutes"]);
  });
});

describe("French plurals", () => {
  it.each([
    [0, "0 jeu comptabilisé"],
    [1, "1 jeu comptabilisé"],
    [2, "2 jeux comptabilisés"],
    [1_000_000, "1000000 de jeux comptabilisés"],
  ])("counts %d games", (count, written) => {
    expect(gamesCounted(count, fr)).toBe(written);
  });

  it("keeps English at one and other", () => {
    expect(gamesCounted(0, en)).toBe("0 games counted");
    expect(gamesCounted(1_000_000, en)).toBe("1000000 games counted");
  });
});

describe("figures in French", () => {
  it("writes the decimal mark the locale uses, and not the unit", () => {
    expect(formatUnlockHeadline(45_500, 5, en)).toBe("45.5K");
    expect(formatUnlockHeadline(45_500, 5, fr)).toBe("45,5K");
    expect(formatUnlockHeadline(1_234_567, 5, fr)).toBe("1,2M");
  });

  it("groups thousands with a plain space in both", () => {
    expect(formatUnlockHeadline(45_500, 6, en)).toBe("45 500");
    expect(formatUnlockHeadline(45_500, 6, fr)).toBe("45 500");
    expect(formatHoursRounded(60 * 3128, fr)).toBe("3 128 h");
  });
});

describe("the unlock headline in French", () => {
  const COUNTS = [0, 9, 999, 1_000, 9_999, 10_000, 45_500, 123_400, 999_950, 1_234_567, 25_000_000];
  const BUDGETS = [3, 4, 5, 6, 7, 8, 9];

  it.each(COUNTS)("is never longer than the English form, for %d", (count) => {
    for (const budget of BUDGETS) {
      const english = formatUnlockHeadline(count, budget, en);
      const french = formatUnlockHeadline(count, budget, fr);

      expect(french.length).toBeLessThanOrEqual(english.length);
    }
  });
});

describe("the library summary in French", () => {
  const view: LibraryView = {
    games: [],
    tallies: {},
    sort: "completed",
    pending: new Set(),
    frozenOrder: null,
  };

  it("speaks and states its figures in the locale it was given", () => {
    const summary = buildLibrarySummary(view, fr);

    expect(summary.unlockedScreenReaderLabel).toBe("0 succès débloqué");
    expect(summary.fraction).toBe("0 / 0 sur 0 jeu comptabilisé");
    expect(summary.playtimeLabel).toBe("—");
  });
});
