/**
 * How dark a day or a slot is drawn: 0 is the empty tile, and 1 to 4 the four tones of
 * the one accent the design has, palest first.
 */
export type UnlockTone = 0 | 1 | 2 | 3 | 4;

/** One entry of the legend: a tone, and the counts it stands for. */
export type UnlockToneBand = {
  readonly tone: UnlockTone;
  /** The band as the legend writes it — "0", "1-2", "12+". */
  readonly label: string;
};

/**
 * The three counts that separate the four tones, lowest first: a day counting
 * at most the first takes the palest tone, one counting more than the third the
 * darkest. Boundaries and not thresholds — they are read off this player's own
 * days, and a fixed set of them is the failure ADR-0007 rules out.
 */
export type UnlockToneScale = readonly [number, number, number];

/**
 * The count at `fraction` of the way up `sorted`, by nearest rank — the
 * smallest count at or below which that fraction of the sample sits. Nearest
 * rank rather than an interpolation, because a boundary at 2.75 is not a
 * boundary the legend can print.
 *
 * The rank always lands inside a sample that is never empty here; the fallback
 * is what `noUncheckedIndexedAccess` asks for, and it answers as an unscaled
 * player would.
 */
const quantile = (sorted: readonly number[], fraction: number): number =>
  sorted[Math.ceil(fraction * sorted.length) - 1] ?? 1;

/**
 * The quartiles of the active counts handed in — days or slots holding at
 * least one unlock. One holding nothing is the empty tile and is never one of
 * these: counting empty ones would spend more than half the tone range on
 * nothing (ADR-0007).
 *
 * Quartiles collapse onto one another when a player's days all held much the
 * same — three days of a single unlock have no first quartile distinct from
 * their third. Each boundary is pushed above the one below it, so four tones
 * stay four and the legend prints four ranges rather than one repeated.
 *
 * Null where there is no active day to read: no scale can be had from nothing,
 * and saying so is what keeps the stand-in from being mistaken for one.
 */
export const toneScaleOf = (activeCounts: readonly number[]): UnlockToneScale | null => {
  if (activeCounts.length === 0) return null;

  const sorted = [...activeCounts].sort((left, right) => left - right);
  const first = Math.max(1, quantile(sorted, 0.25));
  const second = Math.max(first + 1, quantile(sorted, 0.5));
  const third = Math.max(second + 1, quantile(sorted, 0.75));

  return [first, second, third];
};

/** A band holding one count writes that count; a wider one writes its two ends. */
const bandLabel = (from: number, to: number): string =>
  from === to ? String(from) : `${from}-${to}`;

/**
 * The five bands the legend prints, empty tile first. ADR-0007 spends the
 * legend on numbers — `0 · 1-2 · 3-5 · 6-11 · 12+` — rather than the customary
 * `less ▢▢▢▢▢ more`: the window the tones are read over does not match
 * the year the grid draws, and printing the boundaries is what turns that
 * mismatch from a silent trap into a stated fact.
 */
export const legendFor = ([first, second, third]: UnlockToneScale): readonly UnlockToneBand[] => [
  { tone: 0, label: "0" },
  { tone: 1, label: bandLabel(1, first) },
  { tone: 2, label: bandLabel(first + 1, second) },
  { tone: 3, label: bandLabel(second + 1, third) },
  { tone: 4, label: `${third + 1}+` },
];

export const toneOf = (count: number, [first, second, third]: UnlockToneScale): UnlockTone => {
  if (count === 0) return 0;
  if (count <= first) return 1;
  if (count <= second) return 2;
  if (count <= third) return 3;
  return 4;
};
