import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { LocaleToggle } from "./LocaleToggle";

const meta = {
  title: "Atoms/LocaleToggle",
  component: LocaleToggle,
  args: { onSelect: fn() },
} satisfies Meta<typeof LocaleToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const English: Story = { args: { active: "en" } };

export const French: Story = { args: { active: "fr" } };
