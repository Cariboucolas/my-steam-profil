import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { ProgressBar } from "./ProgressBar";

const meta = {
  title: "Atoms/ProgressBar",
  component: ProgressBar,
} satisfies Meta<typeof ProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PartWay: Story = { args: { percentage: 78 } };

export const Complete: Story = { args: { percentage: 100 } };

/** No rate known yet, which is not a rate of zero. */
export const NoRate: Story = { args: { percentage: null } };
