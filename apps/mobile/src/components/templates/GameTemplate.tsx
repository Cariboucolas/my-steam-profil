import type { ReactElement, ReactNode } from "react";
import { FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../../theme/tokens";

/** Room left under the last row, over the home indicator. */
const BOTTOM_ROOM = 40;

/** How many screens' worth of rows a windowed list keeps mounted. */
const WINDOW_SIZE = 7;

type Props = {
  /**
   * Everything above the rows, scrolling with them. The hero at its top runs
   * under the status bar and clears it itself, so nothing is held off the top.
   */
  readonly header: ReactNode;
  /** The rows, each carrying its own key. */
  readonly rows: readonly ReactElement[];
  /** What stands where the rows would be while there are none. */
  readonly empty?: ReactNode;
  /**
   * Set for a list that can run to hundreds of rows: how many to mount at
   * first, after which only what is on screen is. Left out, every row mounts.
   */
  readonly initialRows?: number;
  /** Whether the rows begin a gap below the header rather than straight under it. */
  readonly spaceAfterHeader?: boolean;
};

/**
 * The game screen's layout, and nothing it shows: one scrolling column over
 * the hero, held clear of the home indicator (ADR-0022).
 */
export function GameTemplate({
  header,
  rows,
  empty,
  initialRows,
  spaceAfterHeader = false,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <FlatList
      style={styles.screen}
      data={rows}
      keyExtractor={(row) => String(row.key)}
      renderItem={({ item }) => item}
      contentContainerStyle={{ paddingBottom: insets.bottom + BOTTOM_ROOM }}
      ListHeaderComponent={<>{header}</>}
      {...(spaceAfterHeader ? { ListHeaderComponentStyle: styles.spacedHeader } : {})}
      {...(empty === undefined ? {} : { ListEmptyComponent: <>{empty}</> })}
      {...(initialRows === undefined
        ? {}
        : {
            initialNumToRender: initialRows,
            windowSize: WINDOW_SIZE,
            removeClippedSubviews: true,
          })}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  spacedHeader: {
    paddingBottom: spacing.xl,
  },
});
