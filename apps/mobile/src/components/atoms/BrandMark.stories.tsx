import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { MARK_STOP_COUNT } from "../../theme/mark";
import { BrandMark } from "./BrandMark";

const meta = {
  title: "Atoms/BrandMark",
  component: BrandMark,
  // The size the splash stage draws it at.
  args: { size: 112 },
} satisfies Meta<typeof BrandMark>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The finished mark: every stop, and the bright tip closing the arc. */
export const Whole: Story = { args: { stops: MARK_STOP_COUNT, tip: true } };

/** Part-way through the splash stage's draw, before the tip arrives. */
export const Drawing: Story = { args: { stops: Math.floor(MARK_STOP_COUNT / 2), tip: false } };
