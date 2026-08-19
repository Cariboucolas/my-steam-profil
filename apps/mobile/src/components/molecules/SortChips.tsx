import { ScrollView, StyleSheet } from "react-native";

import type { LibrarySort } from "../../view-models/library";
import { spacing } from "../../theme/tokens";
import { Chip } from "../atoms/Chip";

/** Labels come from the mock, in its order. */
const OPTIONS: readonly (readonly [LibrarySort, string])[] = [
  ["closest", "Closest to 100%"],
  ["recent", "Recently played"],
  ["playtime", "Most played"],
];

type Props = {
  readonly active: LibrarySort;
  readonly onSelect: (sort: LibrarySort) => void;
};

export function SortChips({ active, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {OPTIONS.map(([sort, label]) => (
        <Chip
          key={sort}
          label={label}
          active={sort === active}
          onPress={() => onSelect(sort)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 14,
  },
});
