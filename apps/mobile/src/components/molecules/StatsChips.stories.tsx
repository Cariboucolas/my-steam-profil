import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { StatsChips } from "./StatsChips";

const meta = {
  title: "Molecules/StatsChips",
  component: StatsChips,
  args: {
    cards: [
      { key: "years", label: "Years" },
      { key: "week", label: "Week" },
    ],
    onSelect: fn(),
  },
} satisfies Meta<typeof StatsChips>;

export default meta;

type Story = StoryObj<typeof meta>;

export const YearsInView: Story = { args: { active: "years" } };

export const WeekInView: Story = { args: { active: "week" } };
