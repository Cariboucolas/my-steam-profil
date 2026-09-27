import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { UnlockHalfDots } from "./UnlockHalfDots";

const meta = {
  title: "Molecules/UnlockHalfDots",
  component: UnlockHalfDots,
  args: { onSelect: fn() },
} satisfies Meta<typeof UnlockHalfDots>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstHalfInView: Story = { args: { inView: 0 } };

export const SecondHalfInView: Story = { args: { inView: 1 } };
