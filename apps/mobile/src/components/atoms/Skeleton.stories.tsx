import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { Skeleton } from "./Skeleton";

const meta = {
  title: "Atoms/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Standing in for an achievement's name while its game has yet to say it. */
export const AName: Story = { args: { width: 132, height: 11 } };

/** Standing in for a game's rate while its tally is on its way. */
export const ARate: Story = { args: { width: 34, height: 9 } };
