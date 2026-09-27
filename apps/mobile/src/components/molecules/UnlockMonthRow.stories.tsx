import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { calendarOn, calendarWithNoUnlockDay } from "../../fixtures/calendar";
import { STORY_TODAY } from "../../fixtures/today";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import { UnlockMonthRow } from "./UnlockMonthRow";

const monthOf = (calendar: UnlockCalendar, label: string) => {
  const month = calendar.months.find((one) => one.label === label);
  if (!month) throw new Error(`No ${label} in the calendar fixture.`);
  return month;
};

const meta = {
  title: "Molecules/UnlockMonthRow",
  component: UnlockMonthRow,
} satisfies Meta<typeof UnlockMonthRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A month over and done: every day drawn, its total stated. */
export const PastMonth: Story = { args: { month: monthOf(calendarOn(STORY_TODAY), "MAR") } };

/** The month today falls in: its label picked out, and no day drawn after today. */
export const CurrentMonth: Story = { args: { month: monthOf(calendarOn(STORY_TODAY), "JUN") } };

/**
 * Every day a real UnlockDay counting zero, which is not a month that was not
 * there: the total is a dash rather than a zero worth comparing.
 */
export const NothingUnlockedThatMonth: Story = {
  args: { month: monthOf(calendarWithNoUnlockDay(STORY_TODAY), "MAR") },
};
