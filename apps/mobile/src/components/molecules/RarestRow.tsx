import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NamedUnlock } from "../../view-models/rarest-unlocks";
import { colors, fonts, radius, spacing } from "../../theme/tokens";
import { StatBlock } from "../atoms/StatBlock";

export const RAREST_ICON_TEST_ID = "rarest-row-icon";

/** The same tile as an AchievementRow: one ranking, one row skeleton. */
const TILE = 44;

/**
 * What the figure is a share of. `0.4%` alone would read as a completion rate
 * on a screen full of them, and Rarity runs backwards to every other percentage
 * in this app — 0.4 is a trophy almost nobody holds.
 */
const OF_PLAYERS = "of players";

type Props = {
  readonly row: NamedUnlock;
  readonly onPress: (appId: number) => void;
};

/**
 * One line of the rarest-unlocks ranking.
 *
 * The skeleton is an AchievementRow's — 44 pt tile, name, a line under it — with
 * the game's name where the description would be: across a whole library, which
 * game a trophy came from places it and its flavour text does not.
 *
 * Pressable because the list right above it is. A row naming a game the player
 * owns, sitting under rows that open, would not be understood as inert.
 */
export function RarestRow({ row, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(row.appId)}
      accessibilityRole="button"
      style={styles.row}
    >
      <View style={styles.tile}>
        {/* Null where the game named nothing for it: the row keeps its place
            and its figure, and the tile is left empty rather than broken. */}
        {row.icon !== null && (
          <Image
            testID={RAREST_ICON_TEST_ID}
            source={{ uri: row.icon }}
            style={styles.icon}
            contentFit="cover"
            cachePolicy="disk"
          />
        )}
      </View>

      <View style={styles.middle}>
        <Text numberOfLines={1} style={styles.name}>
          {row.displayName}
        </Text>
        <Text numberOfLines={1} style={styles.game}>
          {row.gameName}
        </Text>
      </View>

      {/* The pair exactly as the stats card writes it. Ten of these down a
          page, so the figure is left plain: the ranking is the emphasis. */}
      <StatBlock value={row.rarityLabel} label={OF_PLAYERS} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    borderWidth: 1,
    // These rows are unlocks, every one of them, so the tile never wears the
    // locked look an AchievementRow has to carry.
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
    overflow: "hidden",
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    color: colors.text,
  },
  game: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.textDim,
  },
});
