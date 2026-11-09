import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { RecountFailedBanner } from "./RecountFailedBanner";

const meta = {
  title: "Molecules/RecountFailedBanner",
  component: RecountFailedBanner,
} satisfies Meta<typeof RecountFailedBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The list of Games could not be loaded again: the library shown stays, and this says so. */
export const Failed: Story = {
  args: { failed: true },
};

/** The last Recount went through, or none was asked for: nothing to say. */
export const NotFailed: Story = {
  args: { failed: false },
};
