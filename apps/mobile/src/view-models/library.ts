import type { GameCompletionDto, GameDto, GameTallyDto } from "@steam/contracts";

/** Tallies keyed by appId; absent means "not asked for yet", not "none". */
export type TallyByAppId = Readonly<Record<number, GameTallyDto>>;

export type LibrarySort = "completed" | "recent" | "playtime";

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
 * When the player last opened it, where that can be said at all.
 *
 * Steam does not always send a last-played time — on the public profile
 * 76561197997989573 not one of its 99 games carries one, while 80 carry
 * playtime. "never played" beside 149 hours is simply untrue, so a game with
 * playtime and no date says nothing about when rather than something false.
 * Only a game with neither was really never opened.
 */
const whenFor = (game: GameDto): string | null => {
  if (game.lastPlayedAt) return formatDay(game.lastPlayedAt);
  return game.playtimeMinutes === 0 ? "never played" : null;
};

const joined = (parts: readonly (string | null)[]): string =>
  parts.filter((part): part is string => part !== null).join(" · ");

const metaFor = (game: GameDto, tally: GameCompletionDto | undefined): string => {
  const played = formatHours(game.playtimeMinutes);
  const when = whenFor(game);

  if (!tally) {
    return joined([played, when]);
  }
  if (tally.total === 0) {
    return `no achievements · ${played}`;
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

const comparatorFor = (
  sort: LibrarySort,
  tallies: TallyByAppId,
): ((a: GameDto, b: GameDto) => number) => {
  if (sort === "playtime") {
    return (a, b) => b.playtimeMinutes - a.playtimeMinutes;
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
  const minutes = games.reduce((sum, game) => sum + game.playtimeMinutes, 0);
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
    playtimeLabel: formatHours(minutes),
  };
};
