import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";

import { spacing } from "../../theme/tokens";
import { Skeleton } from "../atoms/Skeleton";
import { GameTemplate } from "./GameTemplate";

const styles = StyleSheet.create({
  header: { gap: spacing.lg },
  inset: { gap: spacing.lg, paddingHorizontal: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
});

/** Stands in for the hero, the completion summary and the tabs. */
const header = (
  <View style={styles.header}>
    <Skeleton width={390} height={196} radius={0} />
    <View style={styles.inset}>
      <Skeleton width={300} height={60} />
      <Skeleton width={350} height={32} />
    </View>
  </View>
);

/** Stands in for the achievements, an icon and a name each. */
const rows = Array.from({ length: 8 }, (_, index) => (
  <View key={`row-${index}`} style={styles.row}>
    <Skeleton width={40} height={40} />
    <Skeleton width={200} height={11} />
  </View>
));

const meta = {
  title: "Templates/GameTemplate",
  component: GameTemplate,
  args: { header },
} satisfies Meta<typeof GameTemplate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithRows: Story = { args: { rows } };

/** The timeline's layout: its first day starts a gap below the header. */
export const SpacedAfterHeader: Story = { args: { rows, spaceAfterHeader: true } };
