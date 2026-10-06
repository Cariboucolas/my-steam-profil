/** The most guide lines a chart draws under its peak: more would crowd a phone-sized plot. */
export const MAX_SCALE_LINES = 4;

/** The round amounts a scale may step by, before the power of ten. */
const MANTISSAS = [1, 2, 2.5, 5] as const;

/** Far beyond any library: a step of 10^15 unlocks is never reached. */
const MAX_EXPONENT = 15;

/** Every step a scale may take, smallest first, whole unlocks only. */
const STEPS: readonly number[] = Array.from({ length: MAX_EXPONENT + 1 }, (_, exponent) =>
  MANTISSAS.map((mantissa) => mantissa * 10 ** exponent),
)
  .flat()
  .filter(Number.isInteger);

/**
 * The amounts a chart draws its guide lines at, under a peak of `peak`: the
 * smallest round step that leaves no more than MAX_SCALE_LINES of them. Round
 * means one, two, two and a half or five times a power of ten — 250, 500,
 * 750, 1 000 under a peak of 1 027 — which a reader adds up at a glance.
 */
export const scaleValues = (peak: number): readonly number[] => {
  if (peak < 1) return [];
  const step = STEPS.find((candidate) => Math.floor(peak / candidate) <= MAX_SCALE_LINES) ?? peak;
  return Array.from({ length: Math.floor(peak / step) }, (_, index) => step * (index + 1));
};
