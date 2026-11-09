import { useTranslation } from "react-i18next";
import { Animated, StyleSheet } from "react-native";

import { colors } from "../../theme/tokens";
import { usePulse } from "./use-pulse";

export const SKELETON_TEST_ID = "skeleton";

type Props = {
  readonly width: number;
  readonly height: number;
  readonly radius?: number;
};

/**
 * Stands where a value will be while it is being fetched.
 *
 * The library asks for a tally per game and they land in waves, so most rows
 * spend a moment with nothing to show. Drawing them as a dash would be a lie:
 * a dash already means "this game has nothing to earn". The pulse is what
 * separates a row that is waiting from a row that is finished having nothing.
 *
 * A player who has asked their device for less motion gets the block without
 * the swing. The block itself is not negotiable — it is the only thing telling
 * a row that is waiting apart from a Game with nothing to earn.
 */
export function Skeleton({ width, height, radius }: Props) {
  const opacity = usePulse();
  const { t } = useTranslation();

  return (
    <Animated.View
      testID={SKELETON_TEST_ID}
      accessibilityLabel={t("loading")}
      style={{
        ...styles.block,
        width,
        height,
        borderRadius: radius ?? height / 2,
        opacity,
      }}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.track,
  },
});
