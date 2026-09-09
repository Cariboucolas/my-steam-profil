import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NamedUnlock } from "../../view-models/rarest-unlocks";
import { colors } from "../../theme/tokens";
import { Skeleton } from "../atoms/Skeleton";
import { StatBlock } from "../atoms/StatBlock";
import { achievementRowGeometry } from "./achievement-row-geometry";

export const RAREST_ICON_TEST_ID = "rarest-row-icon";

/**
 * What the figure is a share of. `0.4%` alone would read as a completion rate
 * on a screen full of them, and Rarity runs backwards to every other percentage
 * in this app — 0.4 is a trophy almost nobody holds.
 */
const OF_PLAYERS = "of players";

/** Sized to the name it stands in for, so nothing shifts when it lands. */
const NAME_SKELETON_WIDTH = 132;
const NAME_SKELETON_HEIGHT = 11;

type Props = {
  readonly row: NamedUnlock;
  readonly onPress: (appId: number) => void;
};

/**
 * One line of the rarest-unlocks ranking.
 *
 * The shape is an AchievementRow's, read from the geometry the two share — tile,
 * name, a line under it — with the game's name where the description would be:
 * across a whole library, which game an unlock came from places it and its
 * flavour text does not.
 *
 * Pressable because the list right above it is. A row naming a game the player
 * owns, sitting under rows that open, would not be understood as inert.
 */
export function RarestRow({ row, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(row.appId)}
      accessibilityRole="button"
      style={achievementRowGeometry.row}
    >
      <View style={styles.tile}>
        {/* Null where the game named nothing for it: the row keeps its place
            and its figure, and the tile is left empty rather than broken. */}
        {row.icon !== null && (
          <Image
            testID={RAREST_ICON_TEST_ID}
            source={{ uri: row.icon }}
            style={achievementRowGeometry.icon}
            contentFit="cover"
            cachePolicy="disk"
          />
        )}
      </View>

      <View style={achievementRowGeometry.middle}>
        {/* The apiName is a key, not a name: a row wearing one reads as a game
            that calls its achievements ACH_ASCEND_10, not as a row waiting on
            its schema. It pulses in the space the name will fill instead —
            and settles for the key only once its game has answered (#57). */}
        {row.pending ? (
          <View style={styles.nameSkeleton}>
            <Skeleton width={NAME_SKELETON_WIDTH} height={NAME_SKELETON_HEIGHT} />
          </View>
        ) : (
          <Text numberOfLines={1} style={styles.name}>
            {row.displayName}
          </Text>
        )}
        <Text numberOfLines={1} style={achievementRowGeometry.subLine}>
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
  tile: {
    ...achievementRowGeometry.tile,
    // These rows are unlocks, every one of them, so the tile never wears the
    // locked look an AchievementRow has to carry.
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },
  name: {
    ...achievementRowGeometry.name,
    color: colors.text,
  },
  // Holds the pulse at the name's own line height, so the row keeps its
  // height and the game name below it does not step up and down.
  nameSkeleton: {
    height: 17,
    justifyContent: "center",
  },
});
