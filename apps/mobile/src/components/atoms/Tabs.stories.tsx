import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { Tabs } from "./Tabs";

const meta = {
  title: "Atoms/Tabs",
  component: Tabs,
  // The library screen's two tabs.
  args: { labels: ["Completion", "Rarest"], onSelect: fn() },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstSelected: Story = { args: { activeIndex: 0 } };

export const SecondSelected: Story = { args: { activeIndex: 1 } };
