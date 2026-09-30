import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, coverPlaceholder, fonts, spacing } from "../../theme/tokens";
import { gameCoverUrl } from "../../steam/images";

const HEIGHT = 196;
const BACK = 34;

type Props = {
  readonly appId: number;
  readonly name: string;
  /**
   * The figures under the title, empty where there are none to give. Steam can
   * withhold a library's hours and send no last-played date either, and there
   * nothing true is left to write — an empty line still holds its space and
   * still reads as a figure that failed to load, so none is drawn at all.
   */
  readonly meta: string;
  readonly topInset: number;
  readonly onBack: () => void;
  /** The language switch, where the app can offer one (ADR-0023). */
  readonly languageSwitch?: ReactNode;
};

export function GameHero({ appId, name, meta, topInset, onBack, languageSwitch }: Props) {
  const { t } = useTranslation();

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
        accessibilityLabel={t("game.back")}
        style={{ ...styles.back, top: topInset + spacing.sm }}
      >
        <Text style={styles.chevron}>‹</Text>
      </Pressable>

      {languageSwitch === undefined ? null : (
        <View style={{ ...styles.switch, top: topInset + spacing.sm }}>{languageSwitch}</View>
      )}

      <View style={styles.caption}>
        <Text numberOfLines={2} style={styles.name}>
          {name}
        </Text>
        {meta === "" ? null : (
          <Text testID="game-hero-meta" style={styles.meta}>
            {meta}
          </Text>
        )}
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
  switch: {
    position: "absolute",
    right: 14,
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
