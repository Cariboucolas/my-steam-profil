import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { StyleSheet, View } from "react-native";
import { fn } from "storybook/test";

import { spacing } from "../../theme/tokens";
import { useStatsScroll } from "../../view-models/use-stats-scroll";
import { Skeleton } from "../atoms/Skeleton";
import { StatsChips } from "../molecules/StatsChips";
import { StatsTemplate } from "./StatsTemplate";

const styles = StyleSheet.create({
  card: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
});

/** Stands in for a stats card. */
const card = (height: number) => (
  <View style={styles.card}>
    <Skeleton width={350} height={height} />
  </View>
);

const CARDS = [
  { key: "years", label: "Years", node: card(520) },
  { key: "week", label: "Week", node: card(360) },
] as const;

/** The template as the page drives it: the chips follow the scroll and move it. */
function Driven({ title, onBack }: { readonly title: string; readonly onBack: () => void }) {
  const scroll = useStatsScroll(CARDS.map((entry) => entry.key));

  return (
    <StatsTemplate
      title={title}
      onBack={onBack}
      chips={<StatsChips cards={CARDS} active={scroll.active} onSelect={scroll.goTo} />}
      cards={CARDS}
      scroll={scroll.binding}
    />
  );
}

const meta = {
  title: "Templates/StatsTemplate",
  component: Driven,
  args: { title: "Statistics", onBack: fn() },
} satisfies Meta<typeof Driven>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Counted: Story = {};
