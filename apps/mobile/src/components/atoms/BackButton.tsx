import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../../theme/tokens";

const SIZE = 34;

type Props = {
  readonly onPress: () => void;
  /** How far from the top of the screen, safe area included. */
  readonly top: number;
};

/** The way back to the library, floating over whatever the screen draws. */
export function BackButton({ onPress, top }: Props) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("game.back")}
      style={{ ...styles.back, top }}
    >
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    position: "absolute",
    left: 14,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
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
});
