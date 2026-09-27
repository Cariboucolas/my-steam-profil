import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { SortChips } from "./SortChips";

const meta = {
  title: "Molecules/SortChips",
  component: SortChips,
  args: { active: "completed", onSelect: fn() },
} satisfies Meta<typeof SortChips>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EveryFigurePublished: Story = {
  args: { published: { playtime: true, lastPlayed: true } },
};

/** Steam withholds the hours, so the order over them is not offered at all. */
export const PlaytimeWithheld: Story = {
  args: { published: { playtime: false, lastPlayed: true } },
};

/** Neither hours nor dates: only the order that needs neither is left. */
export const NothingButCompletion: Story = {
  args: { published: { playtime: false, lastPlayed: false } },
};
