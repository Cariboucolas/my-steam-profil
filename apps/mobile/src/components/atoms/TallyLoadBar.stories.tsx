import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { TallyLoadBar } from "./TallyLoadBar";

const meta = {
  title: "Atoms/TallyLoadBar",
  component: TallyLoadBar,
} satisfies Meta<typeof TallyLoadBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const JustStarted: Story = { args: { loaded: 0.05 } };

export const MostlyIn: Story = { args: { loaded: 0.8 } };

/** Nothing outstanding: there is no bar at all, rather than a full one. */
export const NothingOutstanding: Story = { args: { loaded: null } };
