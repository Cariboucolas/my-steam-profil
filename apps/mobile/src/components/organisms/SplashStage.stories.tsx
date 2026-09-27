import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { SplashStage } from "./SplashStage";

const meta = {
  title: "Organisms/SplashStage",
  component: SplashStage,
  args: { onDone: fn() },
} satisfies Meta<typeof SplashStage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The work underneath has not finished, so the stage holds after drawing its mark. */
export const Covering: Story = { args: { ready: false } };

/** Everything underneath is ready: the stage runs its course and calls back. */
export const Revealing: Story = { args: { ready: true } };
