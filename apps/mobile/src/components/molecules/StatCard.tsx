import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, spacing } from "../../theme/tokens";
import { TallyLoadBar } from "../atoms/TallyLoadBar";

type Props = {
  /** Already in capitals, as the catalog writes it. */
  readonly eyebrow: string;
  /** The card's key figure, top right. */
  readonly figure?: string | undefined;
  /** The figure's colour, when it sums up a series drawn in its own colour. The accent otherwise. */
  readonly figureColor?: string | undefined;
  /** What the figure counts, under it. */
  readonly caption?: string | undefined;
  readonly subtitle: string;
  /** Why the card has nothing to draw. Set, it stands in for the content and the footer. */
  readonly empty?: string | undefined;
  readonly children?: ReactNode;
  readonly footer?: ReactNode;
  /**
   * How far the library's tallies have got, or null when none are outstanding:
   * the same bar as the library card's, on this card's top edge.
   */
  readonly loaded?: number | null;
};

/**
 * The frame every card of the stats page shares: a heading with its key
 * figure, a sentence on what the card shows, the chart, and its footer. A
 * card with too little to draw says so in place of the chart.
 */
export function StatCard({
  eyebrow,
  figure,
  figureColor,
  caption,
  subtitle,
  empty,
  children,
  footer,
  loaded = null,
}: Props) {
  return (
    <View style={styles.card}>
      <TallyLoadBar loaded={loaded} />
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {figure !== undefined && (
          <View style={styles.figureBlock}>
            <Text style={[styles.figure, figureColor !== undefined && { color: figureColor }]}>
              {figure}
            </Text>
            {caption !== undefined && <Text style={styles.caption}>{caption}</Text>}
          </View>
        )}
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {empty !== undefined ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        <>
          <View style={styles.content}>{children}</View>
          {footer !== undefined && <View style={styles.footer}>{footer}</View>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingTop: spacing.xl + 4,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl + 2,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    // Clips the load bar to the corner radius.
    overflow: "hidden",
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  eyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8, color: colors.textMuted },
  figureBlock: { alignItems: "flex-end", gap: 3 },
  figure: { fontFamily: fonts.monoSemiBold, fontSize: 15, color: colors.accent },
  caption: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.textMuted },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 6,
  },
  content: { marginTop: spacing.lg },
  footer: {
    flexDirection: "row",
    gap: 14,
    marginTop: spacing.md + 2,
    paddingTop: spacing.md + 2,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 40,
  },
});
