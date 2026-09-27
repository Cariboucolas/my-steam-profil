import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { calendarOn } from "../../fixtures/calendar";
import { FIRST_OF_JANUARY, LAST_DAY_OF_THE_YEAR, STORY_TODAY } from "../../fixtures/today";
import { UnlockCalendarCard } from "./UnlockCalendarCard";

const meta = {
  title: "Organisms/UnlockCalendarCard",
  component: UnlockCalendarCard,
} satisfies Meta<typeof UnlockCalendarCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MidYear: Story = { args: { calendar: calendarOn(STORY_TODAY) } };

/** One row, one day: the size of the card is itself how much year there is. */
export const FirstOfJanuary: Story = { args: { calendar: calendarOn(FIRST_OF_JANUARY) } };

/** Twelve rows, more than the card holds: it scrolls, fades and offers its two dots. */
export const LastDayOfTheYear: Story = {
  args: { calendar: calendarOn(LAST_DAY_OF_THE_YEAR) },
};

/** A player who started this year has no LastYearsTotal to be measured against. */
export const NoLastYearsTotal: Story = {
  args: { calendar: calendarOn(STORY_TODAY, new Date(2026, 1, 3, 12)) },
};
