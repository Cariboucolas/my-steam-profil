import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { WithheldFiguresNote } from "./WithheldFiguresNote";

const meta = {
  title: "Molecules/WithheldFiguresNote",
  component: WithheldFiguresNote,
} satisfies Meta<typeof WithheldFiguresNote>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PlaytimeWithheld: Story = {
  args: { published: { playtime: false, lastPlayed: true } },
};

/** The hours are published and the dates are not, so only the dates are named. */
export const LastPlayedWithheld: Story = {
  args: { published: { playtime: true, lastPlayed: false } },
};
