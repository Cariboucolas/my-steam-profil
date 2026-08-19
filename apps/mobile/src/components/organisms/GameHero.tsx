import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, coverPlaceholder, fonts, spacing } from "../../theme/tokens";
import { gameCoverUrl } from "../../steam/images";

const HEIGHT = 196;
const BACK = 34;

type Props = {
  readonly appId: number;
  readonly name: string;
  readonly meta: string;
  readonly topInset: number;
  readonly onBack: () => void;
};

export function GameHero({ appId, name, meta, topInset, onBack }: Props) {
  return (
    <View style={styles.hero}>
      <Image
        source={{ uri: gameCoverUrl(appId) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="disk"
      />
      {/* The mock veils the art so the title stays readable over any cover. */}
      <LinearGradient
        colors={["rgba(11,15,20,0.35)", "rgba(11,15,20,0.62)", colors.bg]}
        locations={[0, 0.46,0.96]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to library"
        style={{ ...styles.back, top: topInset + spacing.sm }}
      >
        <Text style={styles.chevron}>‹</Text>
      </Pressable>

      <View style={styles.caption}>
        <Text numberOfLines={2} style={styles.name}>
          {name}
        </Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: HEIGHT,
    backgroundColor: coverPlaceholder,
  },
  back: {
    position: "absolute",
    left: 14,
    width: BACK,
    height: BACK,
    borderRadius: BACK / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,15,20,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  chevron: {
    fontSize: 20,
    lineHeight: 22,
    color: colors.text,
  },
  caption: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.lg,
  },
  name: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 23,
    color: colors.text,
    letterSpacing: -0.4,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 5,
  },
});
