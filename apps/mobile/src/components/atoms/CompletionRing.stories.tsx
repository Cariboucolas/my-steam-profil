import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { CompletionRing } from "./CompletionRing";

const meta = {
  title: "Atoms/CompletionRing",
  component: CompletionRing,
  // The library card's ring.
  args: { size: 72, strokeWidth: 6 },
} satisfies Meta<typeof CompletionRing>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PartWay: Story = { args: { percentage: 37 } };

export const Complete: Story = { args: { percentage: 100 } };

/** No rate to draw — nothing to earn, or nothing loaded — which is not a rate of zero. */
export const NoRate: Story = { args: { percentage: null } };
