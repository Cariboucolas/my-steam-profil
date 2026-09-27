import type { ReactElement, ReactNode } from "react";
import { FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../../theme/tokens";

/** Room left under the last row, over the home indicator. */
const BOTTOM_ROOM = 40;

/** How many screens' worth of rows a windowed list keeps mounted. */
const WINDOW_SIZE = 7;

type Props = {
  /** Everything above the rows — the profile, its figures, the controls — scrolling with them. */
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
};

/**
 * The library screen's layout, and nothing it shows: one scrolling column,
 * held clear of the status bar and the home indicator (ADR-0022).
 *
 * The rows arrive already drawn rather than as data, so the template knows no
 * game and no ranking, and the list still mounts only the ones on screen.
 */
export function LibraryTemplate({ header, rows, empty, initialRows }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <FlatList
      style={styles.screen}
      data={rows}
      keyExtractor={(row) => String(row.key)}
      renderItem={({ item }) => item}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + BOTTOM_ROOM,
      }}
      ListHeaderComponent={<>{header}</>}
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
});
