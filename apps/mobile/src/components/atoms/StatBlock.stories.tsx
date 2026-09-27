import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { StatBlock } from "./StatBlock";

const meta = {
  title: "Atoms/StatBlock",
  component: StatBlock,
  args: { value: "3 128 h", label: "played" },
} satisfies Meta<typeof StatBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

export const Accented: Story = { args: { accent: true } };

/** Steam publishes none of the library's hours, and a dash says so rather than a zero. */
export const PlaytimeWithheld: Story = { args: { value: "—" } };
