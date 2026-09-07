import {
  buildUnlockCalendar,
  type UnlockCalendar,
  type UnlockDay,
  type UnlockMonth,
  type UnlockToneScale,
} from "./unlock-calendar";
import {
  APRIL_PEAKS,
  EXILE,
  HALLS,
  heldBy,
  libraryWhereUnlocksHappened,
  MARCH_STEADY,
  NOW,
  SOULSTONE,
  stillCounting,
} from "./unlock-calendar.test-support";

const rowFor = (calendar: UnlockCalendar, label: string): UnlockMonth => {
  const month = calendar.months.find((one) => one.label === label);
  if (!month) throw new Error(`no ${label} row in the calendar`);
  return month;
};

/** The days a row really draws, out of the thirty-one columns it always has. */
const drawn = (month: UnlockMonth): readonly UnlockDay[] =>
  month.days.filter((day): day is UnlockDay => day !== null);

/** How many of a row's active days took each tone. */
const activeTones = (month: UnlockMonth): Readonly<Record<number, number>> =>
  drawn(month)
    .filter((day) => day.count > 0)
    .reduce<Record<number, number>>(
      (tally, day) => ({ ...tally, [day.tone]: (tally[day.tone] ?? 0) + 1 }),
      {},
    );

/** Everything the calendar says the player unlocked, across every row. */
const totalOf = (calendar: UnlockCalendar): number =>
  calendar.months
    .flatMap((month) => drawn(month))
    .reduce((sum, day) => sum + day.count, 0);

/**
 * An UnlockDay is a day in the player's own time zone, and the epoch seconds
 * crossing the wire are not — so the zone the assertions below are written in
 * has to be the zone they run in. The package's test script pins TZ=UTC;
 * setting it from inside the file would not work, as Jest hands the test a copy
 * of `process.env` that V8 never sees. This fails loudly rather than letting a
 * run in another zone quietly agree with the wrong day.
 */
beforeAll(() => {
  expect(new Date().getTimezoneOffset()).toBe(0);
});

describe("buildUnlockCalendar", () => {
  it("draws a row for every month up to the one today falls in", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(calendar.months.map((month) => month.label)).toEqual([
      "JAN",
      "FEB",
      "MAR",
      "APR",
    ]);
  });

  it("draws no day the player has not lived through yet", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2026-04-17T10:00:00Z"),
    );
    const april = rowFor(calendar, "APR");

    // Thirty-one columns whatever the month holds: a day has to sit under the
    // same day in every row, or the day axis says nothing.
    expect(april.days).toHaveLength(31);
    expect(drawn(april)).toHaveLength(17);
    // A day already lived through with nothing on it is a real day counting zero.
    expect(april.days[16]?.count).toBe(0);
  });

  it("never draws a day that did not exist", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2026-12-31T10:00:00Z"),
    );

    expect(drawn(rowFor(calendar, "FEB"))).toHaveLength(28);
    expect(drawn(rowFor(calendar, "APR"))).toHaveLength(30);
    expect(drawn(rowFor(calendar, "SEP"))).toHaveLength(30);
    expect(drawn(rowFor(calendar, "NOV"))).toHaveLength(30);
    expect(drawn(rowFor(calendar, "DEC"))).toHaveLength(31);
  });

  it("draws the 29th of February in a leap year", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2028-03-10T10:00:00Z"),
    );

    expect(drawn(rowFor(calendar, "FEB"))).toHaveLength(29);
  });

  it("counts a day's unlocks across every game already counted", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({
        [SOULSTONE]: ["2026-04-05T09:00:00Z", "2026-04-05T22:10:00Z"],
        [HALLS]: ["2026-04-05T11:00:00Z", "2026-04-06T11:00:00Z"],
      }),
      new Date("2026-04-17T10:00:00Z"),
    );
    const april = rowFor(calendar, "APR");

    expect(april.days[4]?.count).toBe(3);
    expect(april.days[5]?.count).toBe(1);
  });

  /** The grid fills as the waves of tallies land, rather than waiting for them. */
  it("counts what has arrived and waits for the rest", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({ [SOULSTONE]: ["2026-04-05T09:00:00Z"] }),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(rowFor(calendar, "APR").days[4]?.count).toBe(1);
    expect(totalOf(calendar)).toBe(1);
  });

  it("puts a late evening unlock on the day the player would call it", () => {
    // Half past eleven at night, half an hour from a different date. A day is
    // the player's own day, so this one is the 14th and not the 15th.
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({ [SOULSTONE]: ["2026-03-14T23:30:00Z"] }),
      new Date("2026-04-17T10:00:00Z"),
    );
    const march = rowFor(calendar, "MAR");

    expect(march.days[13]?.count).toBe(1);
    expect(march.days[14]?.count).toBe(0);
  });

  it("draws nothing for an unlock outside the year it shows", () => {
    // The epoch is what Steam sends for an achievement it will not date.
    // ADR-0006 keeps those out of `unlockedAt`, and 1970 is no day of this year
    // either way.
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({
        [SOULSTONE]: ["1970-01-01T00:00:00Z", "2025-12-31T20:00:00Z"],
      }),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(totalOf(calendar)).toBe(0);
  });

  /**
   * The one number the calendar states outright instead of in tone, and it is
   * stated per row so months can be compared without counting cells.
   */
  it("carries each month's own total", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({
        [SOULSTONE]: ["2026-03-14T09:00:00Z", "2026-03-14T10:00:00Z"],
        [HALLS]: ["2026-03-30T11:00:00Z", "2026-04-02T11:00:00Z"],
      }),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(rowFor(calendar, "MAR").total).toBe(3);
    expect(rowFor(calendar, "MAR").totalLabel).toBe("3");
    expect(rowFor(calendar, "APR").total).toBe(1);
  });

  it("writes an em dash where a month held nothing", () => {
    // A zero would read as a figure worth comparing; the dash says there is
    // nothing to compare, which is what an empty month means.
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened({ [SOULSTONE]: ["2026-03-14T09:00:00Z"] }),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(rowFor(calendar, "JAN").total).toBe(0);
    expect(rowFor(calendar, "JAN").totalLabel).toBe("—");
  });

  /** The row's label is picked out for it; the card does not work out which. */
  it("names the month today falls in", () => {
    const calendar = buildUnlockCalendar(
      libraryWhereUnlocksHappened(),
      new Date("2026-04-17T10:00:00Z"),
    );

    expect(calendar.months.map((month) => month.current)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  /**
   * The two ends the card has to answer honestly. A grid drawn empty is not a
   * failure to show something: it is an exact answer to an exact question, and
   * it is the one screen that shows a new player the shape of what will fill.
   */
  describe("a year holding nothing", () => {
    it("draws the year out empty and still sets it against the one before", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({ [SOULSTONE]: heldBy("2025-06-21", 306) }),
        NOW,
      );

      // Every month the year has reached, drawn to today and holding nothing.
      expect(calendar.months.map((month) => month.label)).toEqual([
        "JAN",
        "FEB",
        "MAR",
        "APR",
      ]);
      expect(drawn(rowFor(calendar, "APR"))).toHaveLength(17);
      expect(totalOf(calendar)).toBe(0);
      expect(calendar.total).toBe(0);
      // A year the player was there for is a target whether or not they have
      // started on this one: 306 more is exactly where they stand.
      expect(calendar.deltaLabel).toBe("-306 vs all of 2025 (306)");
    });

    it("says nothing at all about a year the player was not there for", () => {
      const calendar = buildUnlockCalendar(libraryWhereUnlocksHappened(), NOW);

      expect(calendar.months).toHaveLength(4);
      expect(calendar.total).toBe(0);
      expect(calendar.lastYearsTotal).toBeNull();
      expect(calendar.deltaLabel).toBeNull();
    });
  });

  /**
   * Where the player stands: the running year, the finished one it is set
   * against, and the distance between them. The header is a statement about
   * the very grid under it, so its total is the grid's own rows added up.
   */
  describe("the header", () => {
    it("counts the year it draws, and no more of the player's history", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: ["2026-01-08T09:00:00Z", "2026-03-14T09:00:00Z"],
          [HALLS]: ["2026-04-02T11:00:00Z", "2025-06-21T11:00:00Z"],
        }),
        NOW,
      );

      expect(calendar.year).toBe(2026);
      expect(calendar.total).toBe(3);
      // The one number the header states is the one the rows already state.
      expect(calendar.total).toBe(totalOf(calendar));
    });

    it("names the year and the extent it covers", () => {
      const calendar = buildUnlockCalendar(libraryWhereUnlocksHappened(), NOW);

      expect(calendar.frameLabel).toBe("YEAR 2026 · JAN → DEC");
    });

    /**
     * A finished year against a running one, deliberately unequal: the target
     * is what the player managed in the whole of last year, and the difference
     * says how much of it is still to go.
     */
    it("sets the running year against the whole of the one before", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: [...heldBy("2026-02-11", 82)],
          [HALLS]: [...heldBy("2025-06-21", 306)],
        }),
        NOW,
      );

      expect(calendar.total).toBe(82);
      expect(calendar.lastYearsTotal).toBe(306);
      expect(calendar.deltaLabel).toBe("-224 vs all of 2025 (306)");
    });

    /**
     * "all of" is what stops the line being read like for like. Without it
     * the sentence is true and means the wrong thing: four months of this year
     * are not a year of the last one.
     */
    it("says whose whole year it is comparing against", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({ [HALLS]: heldBy("2025-06-21", 4) }),
        NOW,
      );

      expect(calendar.deltaLabel).toContain("all of 2025");
      // A bare year would read as a like-for-like comparison of two spans
      // that are not alike.
      expect(calendar.deltaLabel).not.toContain("vs 2025");
    });

    it("marks a year already past the one before it", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: heldBy("2026-02-11", 12),
          [HALLS]: heldBy("2025-06-21", 4),
        }),
        NOW,
      );

      expect(calendar.deltaLabel).toBe("+8 vs all of 2025 (4)");
    });

    it("writes a year that has drawn level with the one before as level", () => {
      // There is no direction left to sign, and a "+0" would invent one.
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: heldBy("2026-02-11", 4),
          [HALLS]: heldBy("2025-06-21", 4),
        }),
        NOW,
      );

      expect(calendar.deltaLabel).toBe("0 vs all of 2025 (4)");
    });

    it("drops both figures where there is no year before to compare", () => {
      // "-0 vs all of 2025 (0)" is true and absurd: it measures a player
      // against a year they were not there for.
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({ [SOULSTONE]: heldBy("2026-02-11", 12) }),
        NOW,
      );

      expect(calendar.total).toBe(12);
      expect(calendar.lastYearsTotal).toBeNull();
      expect(calendar.deltaLabel).toBeNull();
    });

    /**
     * The boundary the two totals meet at. A day is the player's own day, so
     * half past eleven on New Year's Eve belongs to the year they would name —
     * and the year before that belongs to neither total.
     */
    it("puts each side of midnight on New Year in the year it falls in", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: [
            "2024-12-31T23:30:00Z",
            "2025-01-01T00:30:00Z",
            "2025-12-31T23:30:00Z",
            "2026-01-01T00:30:00Z",
          ],
        }),
        NOW,
      );

      expect(calendar.total).toBe(1);
      expect(calendar.lastYearsTotal).toBe(2);
    });
  });

  /**
   * One stop per month row, and none per cell. Three hundred and sixty-five
   * stops is a punitive traversal for the same information the row already
   * states, and a nine-pixel cell is not a target a finger could find anyway.
   */
  describe("read aloud", () => {
    it("names each month in full, and what it held", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({ [SOULSTONE]: heldBy("2026-03-14", 12) }),
        NOW,
      );

      // The row's own abbreviation is written for the eye; a screen reader is
      // read to, and "MAR" is not a word.
      expect(rowFor(calendar, "MAR").a11yLabel).toBe("March, 12 unlocks");
    });

    it("reads a month holding one unlock in the singular", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({ [SOULSTONE]: ["2026-02-09T09:00:00Z"] }),
        NOW,
      );

      expect(rowFor(calendar, "FEB").a11yLabel).toBe("February, 1 unlock");
      expect(rowFor(calendar, "APR").a11yLabel).toBe("April, 0 unlocks");
    });

    it("spells out the figure a month holding nothing draws as a dash", () => {
      // The em dash is written for the eye, where a zero would read as a
      // figure worth comparing. Aloud it is a silence or a punctuation mark,
      // so the label states the number the row is standing on.
      const calendar = buildUnlockCalendar(libraryWhereUnlocksHappened(), NOW);
      const january = rowFor(calendar, "JAN");

      expect(january.totalLabel).toBe("—");
      expect(january.a11yLabel).toBe("January, 0 unlocks");
    });

    it("names every month of a full year the way it is said", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened(),
        new Date("2026-12-31T10:00:00Z"),
      );

      expect(
        calendar.months.map((month) => month.a11yLabel.split(",")[0]),
      ).toEqual([
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ]);
    });
  });

  describe("the tone scale", () => {
    it("leaves a day that held nothing outside the scale", () => {
      // Zero is not the palest tone; it is the empty tile, and ADR-0007 keeps
      // it out of the bands entirely.
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({ [SOULSTONE]: ["2026-04-05T09:00:00Z"] }),
        new Date("2026-04-17T10:00:00Z"),
      );
      const april = rowFor(calendar, "APR");

      expect(april.days[3]?.tone).toBe(0);
      expect(april.days[4]?.tone).toBeGreaterThan(0);
    });
    /**
     * Fixed thresholds would paint every one of these days the palest tone —
     * the failure ADR-0007 rules out. Quartiles of the player's own active days
     * spread five modest days over the whole range.
     */
    it("spreads a handful of unlocks across all four tones", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: [
            ...heldBy("2026-04-01", 1),
            ...heldBy("2026-04-02", 1),
            ...heldBy("2026-04-03", 2),
            ...heldBy("2026-04-04", 3),
            ...heldBy("2026-04-05", 5),
          ],
        }),
        new Date("2026-04-17T10:00:00Z"),
      );
      const april = rowFor(calendar, "APR");

      expect(april.days.slice(0, 5).map((day) => day?.tone)).toEqual([
        1, 1, 2, 3, 4,
      ]);
    });
    /**
     * The other half of ADR-0007's argument: a scale read from the player's own
     * days must not pile a busy player into its darkest band either. Twenty
     * active days holding one unlock through twenty land five to a tone; the
     * fixed thresholds the ADR rules out would have put nine of them in `12+`.
     */
    it("keeps a busy player off the top of the scale", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: Array.from({ length: 20 }, (_, index) =>
            heldBy(`2026-03-${String(index + 1).padStart(2, "0")}`, index + 1),
          ).flat(),
        }),
        new Date("2026-04-17T10:00:00Z"),
      );

      expect(activeTones(rowFor(calendar, "MAR"))).toEqual({
        1: 5,
        2: 5,
        3: 5,
        4: 5,
      });
    });
    /**
     * The window the tones are read over deliberately does not match the year
     * the grid draws (ADR-0007): a calendar-bounded window repaints every tone
     * on 1 January, and a sliding one never does.
     */
    it("reads the bands over the 365 days ending today", () => {
      const april = [
        ...heldBy("2026-04-01", 4),
        ...heldBy("2026-04-02", 8),
        ...heldBy("2026-04-03", 12),
      ];
      const aprilTonesGiven = (older: readonly string[]) =>
        rowFor(
          buildUnlockCalendar(
            libraryWhereUnlocksHappened({ [SOULSTONE]: [...april, ...older] }),
            new Date("2026-04-17T10:00:00Z"),
          ),
          "APR",
        )
          .days.slice(0, 3)
          .map((day) => day?.tone);

      // Alone, three days of 4, 8 and 12 are their own quartiles.
      expect(aprilTonesGiven([])).toEqual([1, 2, 3]);
      // The 13th of March 2025 is 400 days back: past the edge of the window,
      // and no part of the sample the quartiles are taken over.
      expect(aprilTonesGiven(heldBy("2025-03-13", 1))).toEqual([1, 2, 3]);
      // The 21st of June 2025 is 300 days back. It falls in the previous
      // calendar year, so the grid never draws it — and it still moves every
      // tone in April, because the window reaches back past 1 January.
      expect(aprilTonesGiven(heldBy("2025-06-21", 1))).toEqual([2, 3, 4]);
    });
    /**
     * What pays for the window not matching the drawn year: the scale is read
     * rather than inferred, and it never says "less" or "more" (ADR-0007). Four
     * active days holding 2, 5, 11 and 20 are their own quartiles, and print
     * the very legend the ADR names.
     */
    it("prints the numbers behind its own tones", () => {
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: [
            ...heldBy("2026-04-01", 2),
            ...heldBy("2026-04-02", 5),
            ...heldBy("2026-04-03", 11),
            ...heldBy("2026-04-04", 20),
          ],
        }),
        new Date("2026-04-17T10:00:00Z"),
      );

      expect(calendar.legend.map((band) => band.tone)).toEqual([0, 1, 2, 3, 4]);
      expect(calendar.legend.map((band) => band.label)).toEqual([
        "0",
        "1-2",
        "3-5",
        "6-11",
        "12+",
      ]);
    });
    it("writes a band holding one count as that count", () => {
      // Three days of a single unlock have no quartile distinct from any
      // other, so the bands are pushed apart to a count each. "1-1" would
      // read as a range where there is only ever one number.
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: [
            ...heldBy("2026-04-01", 1),
            ...heldBy("2026-04-02", 1),
            ...heldBy("2026-04-03", 1),
          ],
        }),
        new Date("2026-04-17T10:00:00Z"),
      );

      expect(calendar.legend.map((band) => band.label)).toEqual([
        "0",
        "1",
        "2",
        "3",
        "4+",
      ]);
    });
    it("still prints a scale for a player who has unlocked nothing", () => {
      // There is nothing to take quartiles of. The grid is drawn empty rather
      // than hidden, so the legend under it has to say something rather than
      // nothing: a tone an unlock, until the player earns one.
      const calendar = buildUnlockCalendar(
        libraryWhereUnlocksHappened(),
        new Date("2026-04-17T10:00:00Z"),
      );

      expect(calendar.legend.map((band) => band.label)).toEqual([
        "0",
        "1",
        "2",
        "3",
        "4+",
      ]);
    });
  });

  describe("while the library is still being counted", () => {
    /**
     * A cold library sends its tallies six at a time, so the calendar is built
     * over and over while they land. Whether any is still outstanding is the
     * one thing the card cannot work out for itself.
     */
    it("reports whether a tally is still outstanding", () => {
      const counted = libraryWhereUnlocksHappened({
        [SOULSTONE]: ["2026-04-05T09:00:00Z"],
      });

      expect(buildUnlockCalendar(counted, NOW).counting).toBe(false);
      expect(
        buildUnlockCalendar(stillCounting(counted, [HALLS]), NOW).counting,
      ).toBe(true);
    });

    /** What the first wave had in hand: the four busy April days, alone. */
    const scaleReadMidLoad = (): UnlockToneScale | null =>
      buildUnlockCalendar(
        stillCounting(libraryWhereUnlocksHappened({ [SOULSTONE]: APRIL_PEAKS }), [
          HALLS,
          EXILE,
        ]),
        NOW,
      ).scale;

    /**
     * A cold library is counting before a single tally has landed, so the
     * first build has nothing of the player's own to read a scale off. It
     * draws against the stand-in all the same — but holding that stand-in for
     * the rest of the load would spend the whole load on fixed thresholds,
     * which is the failure ADR-0007 rules out arriving by another road.
     */
    it("holds no scale until a day of the player's own has landed", () => {
      const nothingYet = buildUnlockCalendar(
        stillCounting(libraryWhereUnlocksHappened(), [SOULSTONE, HALLS, EXILE]),
        NOW,
      );

      expect(nothingYet.scale).toBeNull();
      expect(nothingYet.legend.map((band) => band.label)).toEqual([
        "0",
        "1",
        "2",
        "3",
        "4+",
      ]);
      // The first days to land are read, and those are worth holding.
      expect(scaleReadMidLoad()).toEqual([2, 5, 11]);
    });

    /**
     * Tallies land six at a time in most-recently-played order, so recent
     * months fill first: a scale read afresh on every wave would repaint the
     * whole grid dozens of times over a single cold open (ADR-0007).
     */
    it("holds the scale it was handed while tallies are still landing", () => {
      const later = buildUnlockCalendar(
        stillCounting(
          libraryWhereUnlocksHappened({
            [SOULSTONE]: APRIL_PEAKS,
            [HALLS]: MARCH_STEADY,
          }),
          [EXILE],
        ),
        NOW,
        scaleReadMidLoad(),
      );

      expect(later.legend.map((band) => band.label)).toEqual([
        "0",
        "1-2",
        "3-5",
        "6-11",
        "12+",
      ]);
      // Two unlocks are still the palest tone, as they were a wave ago.
      expect(rowFor(later, "APR").days[0]?.tone).toBe(1);
      // The grid fills all the same: what landed since is drawn, on that scale.
      expect(rowFor(later, "MAR").total).toBe(60);
    });

    /**
     * The one repaint the reader gets, and it is worth it: the scale the grid
     * kept through the load was read off the first wave alone, and the whole
     * window is what it has to answer to.
     */
    it("reads the scale once more when the last tally has landed", () => {
      const done = buildUnlockCalendar(
        libraryWhereUnlocksHappened({
          [SOULSTONE]: APRIL_PEAKS,
          [HALLS]: MARCH_STEADY,
        }),
        NOW,
        scaleReadMidLoad(),
      );

      // Twenty steady days against four busy ones: every quartile lands on
      // three, and the bands are pushed apart from there.
      expect(done.legend.map((band) => band.label)).toEqual([
        "0",
        "1-3",
        "4",
        "5",
        "6+",
      ]);
      // The five unlocks the held scale drew in the middle sit a tone higher.
      expect(rowFor(done, "APR").days[1]?.tone).toBe(3);
    });
  });
});
