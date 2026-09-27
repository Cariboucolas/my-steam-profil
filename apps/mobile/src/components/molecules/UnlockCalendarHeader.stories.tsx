import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { calendarOn } from "../../fixtures/calendar";
import { STORY_TODAY } from "../../fixtures/today";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import { UnlockCalendarHeader } from "./UnlockCalendarHeader";

const headerOf = ({ total, frameLabel, deltaLabel }: UnlockCalendar) => ({
  total,
  frameLabel,
  deltaLabel,
});

const meta = {
  title: "Molecules/UnlockCalendarHeader",
  component: UnlockCalendarHeader,
} satisfies Meta<typeof UnlockCalendarHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The running year against the whole of the one before it, deliberately unequal. */
export const AgainstLastYearsTotal: Story = { args: headerOf(calendarOn(STORY_TODAY)) };

/** A player who was not there last year has nothing to be measured against. */
export const NoLastYearsTotal: Story = {
  args: headerOf(calendarOn(STORY_TODAY, new Date(2026, 1, 3, 12))),
};
