import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { AchievementRow as Row } from "../../view-models/game-progress";
import { colors, fonts } from "../../theme/tokens";
import { achievementRowGeometry } from "./achievement-row-geometry";

export const ACHIEVEMENT_TILE_TEST_ID = "achievement-tile";

type Props = { readonly row: Row };

export function AchievementRow({ row }: Props) {
  return (
    <View style={achievementRowGeometry.row}>
      <View
        testID={ACHIEVEMENT_TILE_TEST_ID}
        style={{
          ...achievementRowGeometry.tile,
          backgroundColor: row.unlocked ? colors.accentSoft : colors.tileEmpty,
          borderColor: row.unlocked ? colors.accentBorder : colors.hairline,
          // Locked icons are already grey; the mock dims them a little further.
          opacity: row.unlocked ? 1 : 0.75,
        }}
      >
        <Image
          source={{ uri: row.iconUrl }}
          style={achievementRowGeometry.icon}
          contentFit="cover"
          cachePolicy="disk"
        />
      </View>

      <View style={achievementRowGeometry.middle}>
        <Text
          numberOfLines={1}
          style={{
            ...achievementRowGeometry.name,
            color: row.unlocked ? colors.text : colors.textMuted,
          }}
        >
          {row.name}
        </Text>
        <Text numberOfLines={1} style={achievementRowGeometry.subLine}>
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
  /** This row's own end: a RarestRow closes on a figure instead. */
  date: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
  },
});
