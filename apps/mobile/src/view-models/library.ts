import type { GameCompletionDto, GameDto, GameTallyDto } from "@steam/contracts";

/** Tallies keyed by appId; absent means "not asked for yet", not "none". */
export type TallyByAppId = Readonly<Record<number, GameTallyDto>>;

export type LibrarySort = "completed" | "recent" | "playtime";

/** What a library must publish for an order over it to be produced at all. */
export type PublishedFigures = {
  readonly playtime: boolean;
  readonly lastPlayed: boolean;
};

/**
 * Which figure each order reads. The default reads tallies, which are ours
 * rather than Steam's, so it is always available.
 */
const SORT_READS: Readonly<Record<LibrarySort, keyof PublishedFigures | null>> = {
  completed: null,
  recent: "lastPlayed",
  playtime: "playtime",
};

const EVERY_SORT = Object.keys(SORT_READS) as readonly LibrarySort[];

/**
 * The orders this library can actually be put in.
 *
 * An order over a figure Steam withholds is not a worse order, it is no order:
 * every key is equal, so the sort is stable and hands back Steam's own
 * arbitrary sequence. Measured on 76561197985221153, where both such orders
 * produced the same untouched list under a chip that looked selected.
 *
 * Held here, beside the comparators that read the figures, so the chips that
 * offer an order and the screen that falls back off one read a single answer.
 */
export const availableSorts = (
  published: PublishedFigures,
): readonly LibrarySort[] =>
  EVERY_SORT.filter((sort) => {
    const reads = SORT_READS[sort];
    return reads === null || published[reads];
  });

export type GameRow = {
  readonly appId: number;
  readonly name: string;
  /** Completion, or null when there is no tally to show. */
  readonly percentage: number | null;
  readonly rateLabel: string;
  readonly meta: string;
  /**
   * A tally for this game is on its way. The row draws a skeleton rather than a
   * dash: a game being counted and a game with nothing to count must not look
   * the same, or waiting reads as an empty result.
   */
  readonly pending: boolean;
};

/** Everything the list needs to lay itself out, including what it is still waiting for. */
export type LibraryView = {
  readonly games: readonly GameDto[];
  readonly tallies: TallyByAppId;
  readonly sort: LibrarySort;
  /** Games whose tally has been asked for and has not come back. */
  readonly pending: ReadonlySet<number>;
  /**
   * While tallies are arriving, the order the list started with. The chosen
   * order depends on tallies, so re-deriving it on every wave would move rows
   * under the reader's finger. Null once nothing is outstanding.
   */
  readonly frozenOrder: readonly number[] | null;
};

export type LibrarySummary = {
  readonly unlocked: number;
  /**
   * The headline spoken rather than drawn. The card may write `45.5K`, which a
   * screen reader would read out as it stands; the width that forces the
   * shortening constrains the eye and not the ear, so the exact count is
   * spoken whatever is drawn. Named for who reads it, as the calendar's is.
   */
  readonly unlockedScreenReaderLabel: string;
  readonly total: number;
  readonly rateLabel: string;
  readonly fraction: string;
  readonly perfectGames: number;
  /** The library's hours, or a dash where Steam publishes none of them. */
  readonly playtimeLabel: string;
};

const MINUTES_PER_HOUR = 60;
const PERFECT = 100;
/**
 * Shared rather than copied: the unlock calendar labels its rows from these
 * too, in capitals. Two lists of twelve months drift the day one of them is
 * corrected.
 */
export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Thousands separated by a space, as the mock writes them ("3 128"). The
 * locale is written into the call rather than read from the device (ADR-0010),
 * and the separator is a plain U+0020 rather than the thin space the design
 * would suggest: the library card measures its headline assuming IBM Plex Mono
 * advances every glyph equally, which holds for U+0020 and need not hold for
 * U+2009 (ADR-0011). Shared rather than copied — three figures on the library
 * screen group their thousands, and a separator that drifted between them
 * would read as three conventions.
 */
const group = (value: number): string =>
  value.toLocaleString("en-US").replace(/,/g, " ");

/**
 * Hours with their thousands grouped, as the mock writes them ("3 128 h").
 * Anything under an hour stays in minutes.
 */
export const formatHours = (minutes: number): string => {
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min`;
  }
  return `${group(Math.round(minutes / MINUTES_PER_HOUR))} h`;
};

/**
 * Largest first, because the unit is chosen after the rounding: 999 950 rounds
 * to 1000.0 thousand, which is a million, and `1000K` would be the right digits
 * under the wrong unit.
 */
const HEADLINE_UNITS = [
  { suffix: "M", divisor: 1_000_000 },
  { suffix: "K", divisor: 1_000 },
] as const;

const ONE_DECIMAL = 1;
const NO_DECIMAL = 0;

const roundTo = (value: number, decimals: number): number => {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
};

/**
 * The figure under a unit, or null when it has not reached the smallest one —
 * `0.1K` is not a shorter way of writing 127, it is a worse one.
 *
 * A trailing zero is dropped by writing the number rather than the digits:
 * 10.0 comes back as `10`. The locale is written into the call (ADR-0010), so
 * the decimal mark is the app's and never the device's; translating the app
 * changes this argument, and nothing else here.
 */
const underUnit = (value: number, decimals: number): string | null => {
  for (const { suffix, divisor } of HEADLINE_UNITS) {
    const scaled = roundTo(value / divisor, decimals);
    if (scaled >= 1) {
      return `${scaled.toLocaleString("en-US")}${suffix}`;
    }
  }
  return null;
};

/**
 * The unlock count as the library card should write it in `maxChars` or fewer:
 * in full while that fits, then with one decimal and a unit, then with neither
 * (ADR-0011). No threshold decides it — the caller measures the room the screen
 * leaves and the most informative form that fits is the one drawn.
 *
 * `maxChars` rather than a width because the headline is monospaced: every
 * glyph advances the same, so the character count is the whole truth about how
 * wide the result will be.
 *
 * Below a thousand nothing shorter exists, so a budget too small to hold the
 * figure cannot be met. The shortest honest form is returned rather than a
 * truncation: the layout guarantees five characters at the narrowest width it
 * serves, which is what keeps this unreachable.
 */
export const formatUnlockHeadline = (unlocked: number, maxChars: number): string => {
  const full = group(unlocked);
  const forms = [full, underUnit(unlocked, ONE_DECIMAL), underUnit(unlocked, NO_DECIMAL)]
    .filter((form): form is string => form !== null);

  return forms.find((form) => form.length <= maxChars) ?? forms[forms.length - 1] ?? full;
};

/**
 * "25 Jun 2026", in the device's own time zone. Built by hand rather than with
 * Intl so the wording stays the same whatever locale the device is set to.
 * Tests pin TZ=UTC so they do not depend on where they run.
 */
export const formatDay = (iso: string): string => {
  const date = new Date(iso);
  const month = MONTHS[date.getMonth()] ?? "";
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
};

/**
 * `3 games counted`, and `1 game counted`. Shared rather than copied: the
 * summary and the rarest ranking are two lines of the same screen counting the
 * same load, and a wording that drifted between them would read as two
 * different figures.
 */
export const gamesCounted = (count: number): string =>
  `${count} game${count === 1 ? "" : "s"} counted`;

/**
 * Null covers two cases the list draws the same way: no tally was fetched, and
 * the game defines no achievements. Neither has a rate worth showing, and 0 %
 * would read as failure rather than absence.
 */
const percentageOf = (tally: GameCompletionDto | undefined): number | null =>
  tally && tally.total > 0 ? Math.round(tally.percentage) : null;

/**
 * Whether Steam publishes how long this library was played.
 *
 * Steam governs playtime's visibility on its own, separately from the
 * Profile's and from the Achievements' — a public Profile can publish every
 * Unlock and withhold every hour, and a withheld Playtime is absent rather
 * than zero (see CONTEXT.md). Steam withholds across a whole library rather
 * than one Game at a time, so which of the two a bare zero is can only be told
 * from the library it sits in — and that reading is already done, once, by
 * whoever mapped the library: a Game arrives carrying either a figure or an
 * absence. So this counts absences rather than re-deriving them, and a game
 * measured at zero minutes is a library publishing its hours and saying they
 * are none.
 *
 * Measured on 76561197985221153, whose 100 games carry no hours at all while
 * three of them hold unlocks dated 2010 to 2014.
 */
export const publishesPlaytime = (games: readonly GameDto[]): boolean =>
  games.some((game) => game.playtimeMinutes !== null);

/**
 * Whether Steam publishes when this library was last played.
 *
 * Its own question, because the two figures do not fall together: on the
 * public profile 76561197997989573, 82 of 101 games carry playtime and not one
 * carries a last-played time. A library can therefore be ordered by hours and
 * not by recency, which is why each figure is asked about separately.
 */
export const publishesLastPlayed = (games: readonly GameDto[]): boolean =>
  games.some((game) => game.lastPlayedAt !== null);

/**
 * Whether the player never opened this Game at all.
 *
 * Only a measured zero says so, and here a zero always is one: a playtime
 * Steam withheld arrives absent rather than as a zero, so a Game with no hours
 * on it says nothing either way about whether it was ever launched. That is
 * what lets this be asked of a Game, where it once had to be asked of the
 * library the Game sits in.
 *
 * Shared rather than copied: the library row writes the answer as `never
 * played` and the game screen as `last played never`, two wordings of one
 * rule, and a rule that drifted between them would call the same game two
 * different things on two screens.
 *
 * The date is asked about as well as the hours, so the answer holds on its own
 * wherever it is called. Steam can date a launch it recorded no minutes for,
 * and calling that game never launched would contradict the date beside it.
 */
export const neverLaunched = (game: GameDto): boolean =>
  game.lastPlayedAt === null && game.playtimeMinutes === 0;

/**
 * The hours over a whole library, or null where Steam publishes none of them.
 *
 * A sum of absent playtimes is absent, not `0 min`: the same rule a row holds,
 * one level up. Asked before the sum rather than after it, so no total is ever
 * built out of figures that were never given.
 */
const totalMinutes = (games: readonly GameDto[]): number | null => {
  const published = games
    .map((game) => game.playtimeMinutes)
    .filter((minutes): minutes is number => minutes !== null);
  return published.length === 0
    ? null
    : published.reduce((sum, minutes) => sum + minutes, 0);
};

/**
 * When the player last opened it, where that can be said at all.
 *
 * Steam does not always send a last-played time — on the public profile
 * 76561197997989573 not one of its 99 games carries one, while 80 carry
 * playtime. "never played" beside 149 hours is simply untrue, so a game with
 * playtime and no date says nothing about when rather than something false.
 *
 */
const whenFor = (game: GameDto): string | null => {
  if (game.lastPlayedAt) return formatDay(game.lastPlayedAt);
  return neverLaunched(game) ? "never played" : null;
};

/**
 * The parts of a line that are actually there, in the mock's separator.
 * Shared rather than copied: the library row and the game screen's caption are
 * two writings of the same figures, and a separator that drifted between them
 * would read as two conventions.
 */
export const joined = (parts: readonly (string | null)[]): string =>
  parts.filter((part): part is string => part !== null).join(" · ");

/** The hours as a row writes them, or nothing at all where Steam withheld them. */
const playedFor = (game: GameDto): string | null =>
  game.playtimeMinutes === null ? null : formatHours(game.playtimeMinutes);

const metaFor = (game: GameDto, tally: GameCompletionDto | undefined): string => {
  const played = playedFor(game);
  const when = whenFor(game);

  if (!tally) {
    return joined([played, when]);
  }
  if (tally.total === 0) {
    return joined(["no achievements", played]);
  }
  return joined([`${tally.unlocked}/${tally.total}`, played, when]);
};

/** A game never launched has no date to sort on, so it goes last. */
const NEVER_PLAYED_LAST = -1;

/**
 * Which band a game belongs to under the default order: finished first, then
 * started, then everything with no tally to speak of.
 */
const FINISHED = 0;
const STARTED = 1;
const NOTHING_TO_SHOW = 2;

const bandOf = (tally: GameCompletionDto | undefined): number => {
  if (!tally || tally.total === 0) return NOTHING_TO_SHOW;
  return tally.unlocked === tally.total ? FINISHED : STARTED;
};

/**
 * Finished games first, richest first among them: 400 of 400 is a larger thing
 * to have done than 10 of 10, and the order should say so. Unfinished games
 * follow by how far along they are, and a game with more to earn leads a game
 * with less at the same rate.
 */
const byWhatIsFinished = (
  tallies: TallyByAppId,
): ((a: GameDto, b: GameDto) => number) => {
  const of = (game: GameDto) => tallies[game.appId]?.completion;
  return (a, b) => {
    const [left, right] = [of(a), of(b)];
    const band = bandOf(left) - bandOf(right);
    if (band !== 0) return band;

    // Within the finished band the rate is 100 for everyone, so size decides.
    if (bandOf(left) === STARTED) {
      const rate = (right?.percentage ?? 0) - (left?.percentage ?? 0);
      if (rate !== 0) return rate;
    }
    return (right?.total ?? 0) - (left?.total ?? 0);
  };
};

/**
 * Longest played first, where there are hours to say so.
 *
 * A Game whose hours Steam withheld carries no key to rank on, so it ranks
 * nothing: it never displaces a Game that has a figure, and two of them are
 * equal to each other, which leaves the sort stable and hands that stretch of
 * the library back in the order it arrived. Reading the absence as a zero
 * instead would rank it below every measured figure and above nothing — an
 * order built out of a number nobody gave.
 *
 * Shared rather than copied: the library's playtime order and the tally
 * fetcher's fallback are the same question asked twice.
 */
export const longestFirst = (a: GameDto, b: GameDto): number => {
  const [left, right] = [a.playtimeMinutes, b.playtimeMinutes];
  if (left !== null && right !== null) return right - left;
  if (left !== null) return -1;
  if (right !== null) return 1;
  return 0;
};

const comparatorFor = (
  sort: LibrarySort,
  tallies: TallyByAppId,
): ((a: GameDto, b: GameDto) => number) => {
  if (sort === "playtime") {
    // `availableSorts` is what keeps this order from being offered over a
    // library that publishes no hours; reaching it directly gets the honest
    // degenerate answer, which `longestFirst` is what makes honest.
    return longestFirst;
  }
  if (sort === "recent") {
    const played = (game: GameDto) =>
      game.lastPlayedAt ? Date.parse(game.lastPlayedAt) : NEVER_PLAYED_LAST;
    return (a, b) => played(b) - played(a);
  }
  return byWhatIsFinished(tallies);
};

/**
 * Orders by the pinned sequence when there is one, and appends anything the
 * sequence does not name rather than dropping it — a library that grew under a
 * running load must still show every game it has.
 */
const orderedBy = (
  games: readonly GameDto[],
  pinned: readonly number[],
): readonly GameDto[] => {
  const rank = new Map(pinned.map((appId, index) => [appId, index]));
  const place = (game: GameDto) => rank.get(game.appId) ?? rank.size;
  return [...games].sort((a, b) => place(a) - place(b));
};

export const buildLibraryRows = (view: LibraryView): readonly GameRow[] => {
  const { games, tallies, sort, pending, frozenOrder } = view;

  // Copied before sorting: the caller's list is not ours to reorder.
  const ordered = frozenOrder
    ? orderedBy(games, frozenOrder)
    : [...games].sort(comparatorFor(sort, tallies));

  return ordered.map((game) => {
    const tally = tallies[game.appId]?.completion;
    const percentage = percentageOf(tally);
    return {
      appId: game.appId,
      name: game.name,
      percentage,
      rateLabel: percentage === null ? "—" : `${percentage}%`,
      meta: metaFor(game, tally),
      pending: pending.has(game.appId) && tally === undefined,
    };
  });
};

/**
 * Reads the same LibraryView the rows are built from. The card and the list
 * describe one screen, so a caller holds one thing and hands it to both — even
 * though the summary has no use for the chosen order or for what is still
 * outstanding.
 */
export const buildLibrarySummary = (view: LibraryView): LibrarySummary => {
  const { games, tallies } = view;

  const loaded = games
    .map((game) => tallies[game.appId]?.completion)
    .filter((entry): entry is GameCompletionDto => entry !== undefined);

  const unlocked = loaded.reduce((sum, e) => sum + e.unlocked, 0);
  const total = loaded.reduce((sum, e) => sum + e.total, 0);
  const minutes = totalMinutes(games);
  const rate = total === 0 ? 0 : Math.round((unlocked / total) * PERFECT);

  return {
    unlocked,
    unlockedScreenReaderLabel: `${group(unlocked)} achievements unlocked`,
    total,
    rateLabel: `${rate}%`,
    // Names what was measured and claims nothing about the rest: the games
    // left out were never launched, so they are excluded rather than missing.
    fraction: `${group(unlocked)} / ${group(total)} across ${gamesCounted(loaded.length)}`,
    perfectGames: loaded.filter((e) => e.total > 0 && e.unlocked === e.total).length,
    playtimeLabel: minutes === null ? "—" : formatHours(minutes),
  };
};
