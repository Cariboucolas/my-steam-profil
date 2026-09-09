import { StyleSheet, Text, View } from "react-native";

import type { RarestTab } from "../../view-models/use-rarest-tab";
import { colors, fonts, spacing } from "../../theme/tokens";

type Props = {
  readonly status: RarestTab["status"];
  /** Whether the library holds an unlock at all — see `RarestTab`. */
  readonly anyUnlock: boolean;
};

/**
 * What the Rarest tab says while it has no rows to show.
 *
 * Four silences, and none of them may be drawn as an empty list. Two are waits
 * — on the count, and on the figures — and two are answers: a player who has
 * unlocked nothing anywhere, and a player whose unlocks Steam publishes no
 * figure for. Only the first of those two is about the player, and telling the
 * second they have unlocked nothing would be a plain untruth.
 */
export function RarestEmpty({ status, anyUnlock }: Props) {
  if (status === "idle") {
    return null;
  }

  if (status === "counting") {
    return (
      <Block
        title="Counting your library first"
        hint="the rarest unlocks are ranked across every game you have played"
      />
    );
  }

  if (status === "loading") {
    return <Block title="Ranking what you have unlocked" />;
  }

  return anyUnlock ? (
    <Block
      title="Nothing here Steam publishes a figure for"
      hint="a rarity we do not hold is not a rarity of zero"
    />
  ) : (
    <Block title="Nothing unlocked in any game yet" />
  );
}

function Block({ title, hint }: { readonly title: string; readonly hint?: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{title}</Text>
      {hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
    paddingHorizontal: spacing.xxl,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  hint: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.textFaint,
    textAlign: "center",
    maxWidth: 250,
  },
});
