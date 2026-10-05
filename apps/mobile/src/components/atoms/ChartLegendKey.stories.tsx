import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ChartLegendKey } from "./ChartLegendKey";

const meta = {
  title: "Atoms/ChartLegendKey",
  component: ChartLegendKey,
  args: { label: "per year", swatch: "bar" },
} satisfies Meta<typeof ChartLegendKey>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bar: Story = {};
export const ThisYear: Story = { args: { label: "this year", swatch: "outlined" } };
export const RunningTotal: Story = { args: { label: "running total", swatch: "line" } };
