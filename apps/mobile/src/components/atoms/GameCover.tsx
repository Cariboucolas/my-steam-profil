import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { colors, coverPlaceholder } from "../../theme/tokens";
import { gameCoverUrl } from "../../steam/images";

type Props = {
  readonly appId: number;
  readonly width: number;
  readonly height: number;
  readonly borderRadius?: number;
};

/**
 * Store header art for a game. expo-image is used rather than RN's Image for
 * its disk cache and its fade-in: a library list scrolls past hundreds of
 * these.
 */
export function GameCover({ appId, width, height, borderRadius = 6 }: Props) {
  return (
    <View style={{ ...styles.frame, width, height, borderRadius }}>
      <Image
        source={{ uri: gameCoverUrl(appId) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={160}
        cachePolicy="disk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: coverPlaceholder,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});
