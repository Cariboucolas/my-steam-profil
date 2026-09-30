import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { calendarOn, calendarWithNoUnlockDay } from "../../fixtures/calendar";
import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import { STORY_TODAY } from "../../fixtures/today";
import type { Translate } from "../../i18n/i18n";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import { UnlockMonthRow } from "./UnlockMonthRow";

const MARCH = 2;
const JUNE = 5;

const monthOf = (calendar: UnlockCalendar, index: number) => {
  const month = calendar.months[index];
  if (!month) throw new Error(`No month ${index} in the calendar fixture.`);
  return month;
};

const meta = {
  title: "Molecules/UnlockMonthRow",
  component: UnlockMonthRow,
} satisfies Meta<typeof UnlockMonthRow>;

export default meta;

type Story = StoryObj<typeof meta>;

const storyOf = (calendarIn: (t: Translate) => UnlockCalendar, index: number): Story => ({
  args: { month: monthOf(calendarIn(english), index) },
  render: inTheToolbarsLanguage(UnlockMonthRow, (t) => ({ month: monthOf(calendarIn(t), index) })),
});

/** A month over and done: every day drawn, its total stated. */
export const PastMonth: Story = storyOf((t) => calendarOn(STORY_TODAY, t), MARCH);

/** The month today falls in: its label picked out, and no day drawn after today. */
export const CurrentMonth: Story = storyOf((t) => calendarOn(STORY_TODAY, t), JUNE);

/**
 * Every day a real UnlockDay counting zero, which is not a month that was not
 * there: the total is a dash rather than a zero worth comparing.
 */
export const NothingUnlockedThatMonth: Story = storyOf(
  (t) => calendarWithNoUnlockDay(STORY_TODAY, t),
  MARCH,
);
