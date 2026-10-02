import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";

import { spacing } from "../../theme/tokens";
import { Skeleton } from "../atoms/Skeleton";
import { LibraryTemplate } from "./LibraryTemplate";

const styles = StyleSheet.create({
  header: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  empty: { alignItems: "center", paddingVertical: 40 },
});

/** Stands in for the profile, the stats card, the calendar and the tabs. */
const header = (
  <View style={styles.header}>
    <Skeleton width={220} height={44} />
    <Skeleton width={350} height={150} radius={16} />
    <Skeleton width={350} height={120} />
    <Skeleton width={350} height={32} />
  </View>
);

/** Stands in for the rows of the library, a cover and a line each. */
const rows = Array.from({ length: 8 }, (_, index) => (
  <View key={`row-${index}`} style={styles.row}>
    <Skeleton width={76} height={36} />
    <Skeleton width={200} height={11} />
  </View>
));

const meta = {
  title: "Templates/LibraryTemplate",
  component: LibraryTemplate,
  args: { header },
} satisfies Meta<typeof LibraryTemplate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithRows: Story = { args: { rows } };

/** No rows: whatever the page puts in their place stands where they would be. */
export const WithNoRows: Story = {
  args: {
    rows: [],
    empty: (
      <View style={styles.empty}>
        <Skeleton width={180} height={13} />
      </View>
    ),
  },
};
