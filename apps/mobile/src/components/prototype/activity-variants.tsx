/**
 * PROTOTYPE — throwaway, not production. Lives on branch
 * `prototype/activity-grid-width`.
 *
 * One question: 31 day-columns have to fit a phone with no horizontal scroll.
 * At what pitch does a cell stop being legible, and can one be tapped?
 *
 * Three ways to spend the width, not three structures — the structure was
 * settled by grilling (CONTEXT.md: UnlockDay / UnlockMonth / UnlockCalendar).
 * Data is synthetic and deterministic: the question is pixels, not plumbing.
 */
import { useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, spacing } from "../../theme/tokens";

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

/** Tones over the empty tile, four steps of the one accent the design has. */
const TONES = [
  colors.tileEmpty,
  "rgba(233,164,85,0.20)",
  "rgba(233,164,85,0.42)",
  "rgba(233,164,85,0.68)",
  "rgba(233,164,85,1)",
] as const;

type Year = {
  readonly counts: readonly (readonly number[])[]; // [month][day-1], months up to today
  readonly today: { month: number; day: number; year: number };
  readonly cuts: readonly [number, number, number];
  readonly total: number;
};

/**
 * Bursty on purpose: real unlocking is a few heavy sessions inside long empty
 * stretches, which is the hardest case for a four-tone scale to survive.
 */
const buildYear = (seed: number): Year => {
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const counts: number[][] = [];
  for (let m = 0; m <= month; m += 1) {
    const length = m === month ? day : new Date(year, m + 1, 0).getDate();
    const row: number[] = [];
    for (let d = 0; d < length; d += 1) {
      row.push(rand() < 0.74 ? 0 : 1 + Math.floor(rand() ** 2 * 16));
    }
    counts.push(row);
  }

  const active = counts.flat().filter((n) => n > 0).sort((a, b) => a - b);
  const at = (q: number) => active[Math.floor(active.length * q)] ?? 1;
  return {
    counts,
    today: { month, day, year },
    cuts: [at(0.25), at(0.5), at(0.75)],
    total: counts.flat().reduce((a, b) => a + b, 0),
  };
};

/**
 * A row always spans the full 31 columns. Without the padding a short month
 * spreads four cells across the whole width and the day axis stops lining up
 * — which is itself the finding: cells cannot be flexed per row.
 */
const padTo = (row: readonly number[], width: number): readonly (number | null)[] => [
  ...row,
  ...Array.from({ length: Math.max(0, width - row.length) }, () => null),
];

const toneOf = (n: number, cuts: Year["cuts"]): number =>
  n === 0 ? 0 : n <= cuts[0] ? 1 : n <= cuts[1] ? 2 : n <= cuts[2] ? 3 : 4;

/** The legend prints its bounds — the decision that pays for a relative scale. */
const legendLabels = (cuts: Year["cuts"]): readonly string[] => {
  const band = (lo: number, hi: number) => (lo >= hi ? String(hi) : `${lo}-${hi}`);
  return ["0", band(1, cuts[0]), band(cuts[0] + 1, cuts[1]), band(cuts[1] + 1, cuts[2]), `${cuts[2] + 1}+`];
};

/* ------------------------------------------------------------------ shared */

type CardProps = { readonly year: Year; readonly note: string };

const Header = ({ year }: { readonly year: Year }) => (
  <View style={s.header}>
    <View style={{ flex: 1 }}>
      <Text style={s.title}>Activity</Text>
      <Text style={s.frame}>{`YEAR ${year.today.year} · JAN → DEC`}</Text>
    </View>
    <View style={{ alignItems: "flex-end" }}>
      <Text style={s.total}>{year.total}</Text>
      <Text style={s.delta}>{`-224 vs all of ${year.today.year - 1} (${year.total + 224})`}</Text>
    </View>
  </View>
);

const Legend = ({ cuts, pitch }: { readonly cuts: Year["cuts"]; readonly pitch: string }) => (
  <View style={s.legend}>
    {legendLabels(cuts).map((label, i) => (
      <View key={label + String(i)} style={s.legendItem}>
        <View style={[s.swatch, { backgroundColor: TONES[i] }]} />
        <Text style={s.legendLabel}>{label}</Text>
      </View>
    ))}
    <Text style={s.measure}>{pitch}</Text>
  </View>
);

/** The measurement is the whole point, so it is on screen, not in a console. */
const measured = (width: number, cols: number, gap: number): string => {
  if (width <= 0) return "measuring…";
  const cell = (width - gap * (cols - 1)) / cols;
  return `${cell.toFixed(1)}px cell · ${cols} cols in ${Math.round(width)}px`;
};

/* ------------------------------------------------- A — faithful to the mock */

const GAP_A = 2;

export const VariantA = ({ year, note }: CardProps) => {
  const [gridWidth, setGridWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width);

  return (
    <View style={s.card}>
      <Header year={year} />
      <Text style={s.note}>{note}</Text>
      <View style={s.axisRow}>
        <View style={{ width: 30 }} />
        <View style={{ flex: 1 }} onLayout={onLayout}>
          <View style={s.axis}>
            {[1, 5, 10, 15, 20, 25, 31].map((d) => (
              <Text key={d} style={s.axisLabel}>{d}</Text>
            ))}
          </View>
        </View>
        <Text style={[s.sigmaHead, { width: 26 }]}>Σ</Text>
      </View>

      {year.counts.map((row, m) => (
        <View key={m} style={s.row}>
          <Text style={[s.month, { width: 30 }, m === year.today.month && s.monthNow]}>{MONTHS[m]}</Text>
          <View style={s.cells}>
            {padTo(row, 31).map((n, d) => (
              <View
                key={d}
                style={[s.cell, { marginRight: GAP_A, backgroundColor: n === null ? "transparent" : TONES[toneOf(n, year.cuts)] }]}
              />
            ))}
          </View>
          <Text style={[s.sigma, { width: 26 }]}>
            {row.reduce((a, b) => a + b, 0) || "—"}
          </Text>
        </View>
      ))}
      <Legend cuts={year.cuts} pitch={measured(gridWidth, 31, GAP_A)} />
    </View>
  );
};
VariantA.variantName = "Faithful — label + 31 + Σ column";

/* ------------------------------ B — every pixel to the grid, Σ in the label */

const GAP_B = 1;

export const VariantB = ({ year, note }: CardProps) => {
  const [gridWidth, setGridWidth] = useState(0);

  return (
    <View style={s.cardBleed}>
      <View style={s.bleedInner}>
        <Header year={year} />
        <Text style={s.note}>{note}</Text>
      </View>

      {year.counts.map((row, m) => {
        const sum = row.reduce((a, b) => a + b, 0);
        return (
          <View key={m} style={s.rowB}>
            <Text style={[s.monthB, m === year.today.month && s.monthNow]}>
              {MONTHS[m]}
              <Text style={s.sigmaInline}>{sum ? ` ${sum}` : " —"}</Text>
            </Text>
            <View
              style={s.cells}
              onLayout={(e) => m === 0 && setGridWidth(e.nativeEvent.layout.width)}
            >
              {padTo(row, 31).map((n, d) => (
                <View
                  key={d}
                  style={[s.cell, { marginRight: GAP_B, backgroundColor: n === null ? "transparent" : TONES[toneOf(n, year.cuts)] }]}
                />
              ))}
            </View>
          </View>
        );
      })}

      <View style={s.bleedInner}>
        <Legend cuts={year.cuts} pitch={measured(gridWidth, 31, GAP_B)} />
      </View>
    </View>
  );
};
VariantB.variantName = "Full-bleed — Σ folded into the month label";

/* ------------------------------------------- C — two half-months, 16 columns */

const GAP_C = 3;

export const VariantC = ({ year, note }: CardProps) => {
  const [gridWidth, setGridWidth] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <View style={s.card}>
      <Header year={year} />
      <Text style={s.note}>{note}</Text>
      {picked !== null && <Text style={s.picked}>{picked}</Text>}

      {year.counts.map((row, m) => {
        const sum = row.reduce((a, b) => a + b, 0);
        return (
          <View key={m} style={s.blockC}>
            <View style={s.rowC}>
              <Text style={[s.month, { width: 30 }, m === year.today.month && s.monthNow]}>{MONTHS[m]}</Text>
              <View style={s.cells} onLayout={(e) => m === 0 && setGridWidth(e.nativeEvent.layout.width)}>
                {padTo(row.slice(0, 16), 16).map((n, d) => (
                  <Pressable
                    key={d}
                    disabled={n === null}
                    onPress={() => setPicked(`${String(n)} unlocks · ${d + 1} ${MONTHS[m]}`)}
                    style={[s.cellC, { marginRight: GAP_C, backgroundColor: n === null ? "transparent" : TONES[toneOf(n, year.cuts)] }]}
                  />
                ))}
              </View>
              <Text style={[s.sigma, { width: 26 }]}>{sum || "—"}</Text>
            </View>
            <View style={s.rowC}>
              <View style={{ width: 30 }} />
              <View style={s.cells}>
                {padTo(row.slice(16), 16).map((n, d) => (
                  <Pressable
                    key={d}
                    disabled={n === null}
                    onPress={() => setPicked(`${String(n)} unlocks · ${d + 17} ${MONTHS[m]}`)}
                    style={[s.cellC, { marginRight: GAP_C, backgroundColor: n === null ? "transparent" : TONES[toneOf(n, year.cuts)] }]}
                  />
                ))}
              </View>
              <View style={{ width: 26 }} />
            </View>
          </View>
        );
      })}
      <Legend cuts={year.cuts} pitch={measured(gridWidth, 16, GAP_C)} />
    </View>
  );
};
VariantC.variantName = "Half-months — two rows of 16, cells are pressable";

/* ------------------------------------------------------------------ styles */

const s = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cardBleed: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
  },
  bleedInner: { paddingHorizontal: spacing.sm },

  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
  title: { color: colors.text, fontFamily: fonts.sansSemiBold, fontSize: 17 },
  frame: { color: colors.textDim, fontFamily: fonts.mono, fontSize: 10, marginTop: 3 },
  total: { color: colors.accent, fontFamily: fonts.monoSemiBold, fontSize: 26, lineHeight: 28 },
  delta: { color: "#e08a7a", fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
  note: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 9, marginBottom: spacing.sm },
  picked: { color: colors.accent, fontFamily: fonts.mono, fontSize: 11, marginBottom: spacing.xs },

  axisRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  axis: { flexDirection: "row", justifyContent: "space-between" },
  axisLabel: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 8 },
  sigmaHead: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 9, textAlign: "right" },

  row: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  rowB: { flexDirection: "row", alignItems: "center", marginBottom: 2, paddingHorizontal: spacing.sm },
  rowC: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  blockC: { marginBottom: 4 },

  month: { color: colors.textDim, fontFamily: fonts.mono, fontSize: 9 },
  monthB: { color: colors.textDim, fontFamily: fonts.mono, fontSize: 9, width: 46 },
  monthNow: { color: colors.accent },
  sigmaInline: { color: colors.accent },

  cells: { flex: 1, flexDirection: "row" },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 1 },
  cellC: { flex: 1, aspectRatio: 1, borderRadius: 2 },

  sigma: { color: colors.accent, fontFamily: fonts.mono, fontSize: 9, textAlign: "right" },

  legend: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", marginRight: spacing.sm },
  swatch: { width: 9, height: 9, borderRadius: 2, marginRight: 3 },
  legendLabel: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 8 },
  measure: { color: colors.accent, fontFamily: fonts.mono, fontSize: 8, marginLeft: "auto" },
});

export { buildYear };
export type { Year };
