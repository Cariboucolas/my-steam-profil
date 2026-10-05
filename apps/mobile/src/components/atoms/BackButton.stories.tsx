import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { BackButton } from "./BackButton";

const meta = {
  title: "Atoms/BackButton",
  component: BackButton,
  args: { onPress: fn(), top: 8 },
} satisfies Meta<typeof BackButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
