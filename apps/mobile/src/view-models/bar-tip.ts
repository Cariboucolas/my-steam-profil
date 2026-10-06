type TipPlacement = {
  /** Which bar, from the left. */
  readonly index: number;
  /** How many bars share the plot, each as wide as the others. */
  readonly count: number;
  /** The plot's width, bars and gaps together. */
  readonly width: number;
  readonly gap: number;
  readonly tipWidth: number;
};

/**
 * Where a bar's tip starts from the plot's left edge: centred over the bar,
 * and held inside the plot so the first and last years' tips are not cut off.
 */
export const tipLeft = ({ index, count, width, gap, tipWidth }: TipPlacement): number => {
  const column = (width - (count - 1) * gap) / count;
  const centre = index * (column + gap) + column / 2;
  return Math.min(Math.max(centre - tipWidth / 2, 0), Math.max(width - tipWidth, 0));
};
