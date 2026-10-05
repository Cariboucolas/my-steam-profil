import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";
import { fn } from "storybook/test";

import { spacing } from "../../theme/tokens";
import { Skeleton } from "../atoms/Skeleton";
import { StatsTemplate } from "./StatsTemplate";

const styles = StyleSheet.create({
  cards: { gap: spacing.lg, paddingHorizontal: spacing.xl },
});

/** Stands in for the stats cards, one under the other. */
const cards = (
  <View style={styles.cards}>
    <Skeleton width={350} height={320} />
    <Skeleton width={350} height={200} />
  </View>
);

const meta = {
  title: "Templates/StatsTemplate",
  component: StatsTemplate,
  args: { title: "Statistics", loaded: null, onBack: fn(), children: cards },
} satisfies Meta<typeof StatsTemplate>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Counted: Story = {};
export const Counting: Story = { args: { loaded: 0.4 } };
