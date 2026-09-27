import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { Chip } from "./Chip";

const meta = {
  title: "Atoms/Chip",
  component: Chip,
  args: { label: "Completed first", onPress: fn() },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = { args: { active: true } };

export const Inactive: Story = { args: { active: false } };
