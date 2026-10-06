import type { GameDto } from "@steam/contracts";

import { translatorFor } from "../i18n/i18n";
import type { CountedUnlocks } from "./unlock-days";
import { buildYearsAndCumulative, type YearsAndCumulative } from "./years-and-cumulative";

const english = translatorFor("en");
const french = translatorFor("fr");
const NOW = new Date("2026-04-17T10:00:00Z");

const game = (appId: number): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 60,
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt: null,
});

/** One game per list of instants; null is an unlock Steam will not date. */
const viewOf = (...perGame: readonly (readonly (string | null)[])[]): CountedUnlocks => ({
  games: perGame.map((_, index) => game(index + 1)),
  tallies: Object.fromEntries(
    perGame.map((instants, index) => [
      index + 1,
      {
        completion: { unlocked: instants.length, total: 100, percentage: 0 },
        unlocks: instants.map((iso, n) => ({
          apiName: `ACH_${n}`,
          at: iso === null ? null : Date.parse(iso) / 1000,
        })),
      },
    ]),
  ),
});

const drawn = (model: YearsAndCumulative) => {
  if (model.kind !== "drawn") throw new Error(`expected a drawn card, got ${model.kind}`);
  return model;
};

const counted = (view: CountedUnlocks) => drawn(buildYearsAndCumulative(view, true, NOW, english));

/** `n` unlocks on the same instant. */
const times = (n: number, iso: string): readonly string[] => Array.from({ length: n }, () => iso);

/** The days are the device's own, so the assertions hold only in the zone the test script pins. */
beforeAll(() => {
  expect(new Date().getTimezoneOffset()).toBe(0);
});

describe("buildYearsAndCumulative", () => {
  it("waits while counting with no dated unlock in hand", () => {
    expect(buildYearsAndCumulative(viewOf([null]), false, NOW, english)).toEqual({
      kind: "waiting",
    });
  });

  it("is empty once counted with no dated unlock", () => {
    expect(buildYearsAndCumulative(viewOf([null]), true, NOW, english)).toEqual({ kind: "empty" });
  });

  it("draws one bar per year up to this one, an empty year included", () => {
    const card = counted(
      viewOf(["2023-03-01T10:00:00Z", "2023-05-01T10:00:00Z", "2025-01-01T10:00:00Z"]),
    );

    expect(card.bars.map((bar) => [bar.year, bar.share])).toEqual([
      [2023, 1],
      [2024, 0],
      [2025, 0.5],
      [2026, 0],
    ]);
    expect(card.bars.map((bar) => bar.current)).toEqual([false, false, false, true]);
    expect(card.total).toBe("3");
    expect(card.span).toBe("dated unlocks · 2023 → 2026");
  });

  it("counts across every game of the library", () => {
    const card = counted(viewOf(["2026-01-02T10:00:00Z"], ["2026-01-03T10:00:00Z"]));
    expect(card.total).toBe("2");
  });

  it("leaves undated unlocks out of every figure", () => {
    expect(counted(viewOf(["2026-01-02T10:00:00Z", null, null])).total).toBe("1");
  });

  it("writes a figure over the peak year and this year only", () => {
    const card = counted(
      viewOf([...times(2, "2024-02-01T10:00:00Z"), "2025-02-01T10:00:00Z", "2026-02-01T10:00:00Z"]),
    );
    expect(card.bars.map((bar) => bar.figure)).toEqual(["2", null, "1"]);
  });

  it("gives every bar its amount, for a touch to reveal", () => {
    const card = counted(
      viewOf([...times(2, "2024-02-01T10:00:00Z"), "2025-02-01T10:00:00Z", "2026-02-01T10:00:00Z"]),
    );
    expect(card.bars.map((bar) => bar.amount)).toEqual(["2", "1", "1"]);
  });

  it("draws guide lines at round amounts, against the peak year", () => {
    const card = counted(viewOf(times(5, "2025-02-01T10:00:00Z")));
    expect(card.scale).toEqual([
      { label: "2", share: 0.4 },
      { label: "4", share: 0.8 },
    ]);
  });

  it("writes the guide lines' amounts in the reader's language", () => {
    const card = drawn(
      buildYearsAndCumulative(viewOf(times(2600, "2025-02-01T10:00:00Z")), true, NOW, french),
    );
    expect(card.scale.map((line) => line.label)).toEqual(["1 000", "2 000"]);
  });

  it("takes the most recent year as the peak on a tie", () => {
    const card = counted(viewOf(["2024-02-01T10:00:00Z", "2025-02-01T10:00:00Z"]));
    // 2026 holds nothing but is this year, which always carries its figure.
    expect(card.bars.map((bar) => bar.figure)).toEqual([null, "1", "0"]);
  });

  it("keeps an unlock dated after this year", () => {
    const card = counted(viewOf(["2027-01-05T10:00:00Z"]));
    expect(card.bars.map((bar) => bar.year)).toEqual([2027]);
    expect(card.total).toBe("1");
  });

  it("draws the running total against the grand total, and none for a single year", () => {
    const card = counted(viewOf([...times(3, "2025-02-01T10:00:00Z"), "2026-02-01T10:00:00Z"]));
    expect(card.cumulative).toEqual([0.75, 1]);

    expect(counted(viewOf(["2026-02-01T10:00:00Z"])).cumulative).toBeNull();
  });

  it("labels every year up to thirteen bars", () => {
    const card = counted(viewOf(["2014-02-01T10:00:00Z"]));
    expect(card.bars).toHaveLength(13);
    expect(card.bars.every((bar) => bar.label !== null)).toBe(true);
    expect(card.bars[0]?.label).toBe("’14");
  });

  it("labels every other year beyond thirteen bars, this year always", () => {
    const card = counted(viewOf(["2012-02-01T10:00:00Z"]));
    expect(card.bars).toHaveLength(15);
    expect(card.bars.at(-1)?.label).toBe("’26");
    expect(card.bars.at(-2)?.label).toBeNull();
    expect(card.bars[0]?.label).toBe("’12");
  });

  it("holds the records back until the library is counted", () => {
    const card = drawn(
      buildYearsAndCumulative(viewOf(["2026-02-01T10:00:00Z"]), false, NOW, english),
    );
    expect(card.records).toBeNull();
  });

  it("names the best month and the best day, the most recent on a tie", () => {
    const card = counted(
      viewOf([
        ...times(2, "2025-03-10T10:00:00Z"),
        ...times(2, "2025-06-20T10:00:00Z"),
        "2025-06-21T10:00:00Z",
      ]),
    );
    expect(card.records?.bestMonth).toEqual({ value: "3", label: "best month", when: "Jun 2025" });
    expect(card.records?.bestDay).toEqual({ value: "2", label: "best day", when: "20 Jun 2025" });
  });

  it("counts a late-evening unlock on the day it happened", () => {
    const card = counted(
      viewOf(["2025-06-20T23:30:00Z", "2025-06-20T08:00:00Z", "2025-06-21T00:30:00Z"]),
    );
    expect(card.records?.bestDay.when).toBe("20 Jun 2025");
  });

  it("runs a streak across New Year and names the month it ended in", () => {
    const card = counted(
      viewOf([
        "2025-12-30T10:00:00Z",
        "2025-12-31T10:00:00Z",
        "2026-01-01T10:00:00Z",
        "2026-03-01T10:00:00Z",
      ]),
    );
    expect(card.records?.longestStreak).toEqual({
      value: "3 days",
      label: "longest streak",
      when: "Jan 2026",
    });
  });

  it("takes the most recent streak on a tie", () => {
    const card = counted(
      viewOf([
        "2025-02-01T10:00:00Z",
        "2025-02-02T10:00:00Z",
        "2025-08-01T10:00:00Z",
        "2025-08-02T10:00:00Z",
      ]),
    );
    expect(card.records?.longestStreak.when).toBe("Aug 2025");
  });

  it("says the whole chart in one sentence", () => {
    const card = counted(viewOf([...times(1104, "2025-02-01T10:00:00Z"), "2026-02-01T10:00:00Z"]));
    expect(card.total).toBe("1 105");
    expect(card.screenReaderLabel).toBe(
      "2025 to 2026: 1 105 dated unlocks, best year 2025 with 1 104",
    );
  });

  it("speaks French when the reader chose it", () => {
    const card = drawn(
      buildYearsAndCumulative(
        viewOf(["2025-12-30T10:00:00Z", "2025-12-31T10:00:00Z"]),
        true,
        NOW,
        french,
      ),
    );
    expect(card.span).toBe("succès datés · 2025 → 2026");
    expect(card.records?.longestStreak).toEqual({
      value: "2 jours",
      label: "plus longue série",
      when: "déc. 2025",
    });
  });
});
