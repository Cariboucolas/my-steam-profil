import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { spacing } from "../../theme/tokens";
import { availableSorts, type LibrarySort, type PublishedFigures } from "../../view-models/library";
import { Chip } from "../atoms/Chip";

/**
 * The default leads with the games the player has finished — the thing the app
 * is about — rather than with the ones nearest to finishing.
 *
 * What each order reads is not written here: `availableSorts` holds that, so
 * the chips and the screen's fallback cannot disagree about which orders exist.
 * This is the labels, and nothing else.
 */
const ORDER: readonly LibrarySort[] = ["completed", "recent", "playtime"];

type Props = {
  readonly active: LibrarySort;
  readonly onSelect: (sort: LibrarySort) => void;
  /**
   * What Steam publishes about this library. An order over a figure it
   * withholds is not offered: every key would be equal, so the sort is stable
   * and hands back Steam's own arbitrary order under a chip that looks
   * selected.
   */
  readonly published: PublishedFigures;
};

export function SortChips({ active, onSelect, published }: Props) {
  const { t } = useTranslation();
  const available = availableSorts(published);
  const offered = ORDER.filter((sort) => available.includes(sort)).map(
    (sort) => [sort, t(`library.sorts.${sort}`)] as const,
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {offered.map(([sort, label]) => (
        <Chip key={sort} label={label} active={sort === active} onPress={() => onSelect(sort)} />
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
