import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { calendarOn, calendarWithNoUnlockDay } from "../../fixtures/calendar";
import { STORY_TODAY } from "../../fixtures/today";
import { UnlockToneLegend } from "./UnlockToneLegend";

const meta = {
  title: "Molecules/UnlockToneLegend",
  component: UnlockToneLegend,
} satisfies Meta<typeof UnlockToneLegend>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The bands read off this player's own active days (ADR-0007). */
export const ReadFromThePlayer: Story = {
  args: { legend: calendarOn(STORY_TODAY).legend },
};

/** No active day to read a scale from: the bands a player is drawn against until one exists. */
export const Unscaled: Story = {
  args: { legend: calendarWithNoUnlockDay(STORY_TODAY).legend },
};
