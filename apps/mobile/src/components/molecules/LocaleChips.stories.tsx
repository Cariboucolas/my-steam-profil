import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { LocaleChips } from "./LocaleChips";

const meta = {
  title: "Molecules/LocaleChips",
  component: LocaleChips,
  args: { onSelect: fn() },
} satisfies Meta<typeof LocaleChips>;

export default meta;

type Story = StoryObj<typeof meta>;

export const English: Story = { args: { active: "en" } };

export const French: Story = { args: { active: "fr" } };
