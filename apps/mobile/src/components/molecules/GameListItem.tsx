import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GameRow } from "../../view-models/library";
import { colors, fonts, spacing } from "../../theme/tokens";
import { GameCover } from "../atoms/GameCover";
import { Skeleton } from "../atoms/Skeleton";
import { ProgressBar } from "../atoms/ProgressBar";

const COVER_WIDTH = 76;
const COVER_HEIGHT = 36;

/** Sized to the rate it stands in for, so nothing shifts when it lands. */
const RATE_SKELETON_WIDTH = 34;
const RATE_SKELETON_HEIGHT = 9;

type Props = {
  readonly row: GameRow;
  readonly onPress: (appId: number) => void;
};

export function GameListItem({ row, onPress }: Props) {
  const known = row.percentage !== null;

  return (
    <Pressable
      onPress={() => onPress(row.appId)}
      accessibilityRole="button"
      style={styles.row}
    >
      <GameCover
        appId={row.appId}
        width={COVER_WIDTH}
        height={COVER_HEIGHT}
      />
      <View style={styles.middle}>
        <Text numberOfLines={1} style={styles.name}>
          {row.name}
        </Text>
        <ProgressBar percentage={row.percentage} />
        <Text numberOfLines={1} style={styles.meta}>
          {row.meta}
        </Text>
      </View>
      {row.pending ? (
        // A dash means "nothing to earn here", so a row still being counted
        // cannot borrow it: it pulses instead, in the space the rate will fill.
        <View style={styles.rate}>
          <Skeleton width={RATE_SKELETON_WIDTH} height={RATE_SKELETON_HEIGHT} />
        </View>
      ) : (
        <Text
          style={{
            ...styles.rate,
            color: known ? colors.text : colors.textFaint,
          }}
        >
          {row.rateLabel}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  middle: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  name: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textDim,
  },
  rate: {
    fontFamily: fonts.monoMedium,
    fontSize: 15,
    minWidth: 44,
    textAlign: "right",
    // Holds the skeleton where the digits will be, so the row does not jump.
    alignItems: "flex-end",
  },
});
