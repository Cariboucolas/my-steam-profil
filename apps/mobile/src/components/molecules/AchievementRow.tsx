import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { AchievementRow as Row } from "../../view-models/game-progress";
import { colors, fonts, radius, spacing } from "../../theme/tokens";

export const ACHIEVEMENT_TILE_TEST_ID = "achievement-tile";

const TILE = 44;

type Props = { readonly row: Row };

export function AchievementRow({ row }: Props) {
  return (
    <View style={styles.row}>
      <View
        testID={ACHIEVEMENT_TILE_TEST_ID}
        style={{
          ...styles.tile,
          backgroundColor: row.unlocked ? colors.accentSoft : colors.tileEmpty,
          borderColor: row.unlocked ? colors.accentBorder : colors.hairline,
          // Locked icons are already grey; the mock dims them a little further.
          opacity: row.unlocked ? 1 : 0.75,
        }}
      >
        <Image
          source={{ uri: row.iconUrl }}
          style={styles.icon}
          contentFit="cover"
          cachePolicy="disk"
        />
      </View>

      <View style={styles.middle}>
        <Text
          numberOfLines={1}
          style={{
            ...styles.name,
            color: row.unlocked ? colors.text : colors.textMuted,
          }}
        >
          {row.name}
        </Text>
        <Text numberOfLines={1} style={styles.description}>
          {row.description}
        </Text>
      </View>

      <Text
        style={{
          ...styles.date,
          color: row.unlocked ? colors.textMuted : colors.textFaint,
        }}
      >
        {row.dateLabel}
      </Text>
    </View>
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
  },
  description: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.textDim,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
  },
});
