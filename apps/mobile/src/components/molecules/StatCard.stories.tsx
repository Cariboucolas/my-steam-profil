import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { Text } from "react-native";

import { colors } from "../../theme/tokens";
import { StatCard } from "./StatCard";

const meta = {
  title: "Molecules/StatCard",
  component: StatCard,
  args: {
    eyebrow: "YEARS AND RUNNING TOTAL",
    figure: "3 912",
    caption: "dated unlocks · 2014 → 2026",
    subtitle: "What each year brought, and the pile growing since the first unlock.",
    children: <Text style={{ color: colors.text }}>chart</Text>,
    footer: <Text style={{ color: colors.textMuted }}>records</Text>,
  },
} satisfies Meta<typeof StatCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithContent: Story = {};
export const Empty: Story = {
  args: { figure: undefined, caption: undefined, empty: "No dated unlocks" },
};
