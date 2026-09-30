import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { calendarOn } from "../../fixtures/calendar";
import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import { FIRST_OF_JANUARY, LAST_DAY_OF_THE_YEAR, STORY_TODAY } from "../../fixtures/today";
import type { Translate } from "../../i18n/i18n";
import type { UnlockCalendar } from "../../view-models/unlock-calendar";
import { UnlockCalendarCard } from "./UnlockCalendarCard";

const meta = {
  title: "Organisms/UnlockCalendarCard",
  component: UnlockCalendarCard,
} satisfies Meta<typeof UnlockCalendarCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const storyOf = (calendarIn: (t: Translate) => UnlockCalendar): Story => ({
  args: { calendar: calendarIn(english) },
  render: inTheToolbarsLanguage(UnlockCalendarCard, (t) => ({ calendar: calendarIn(t) })),
});

export const MidYear: Story = storyOf((t) => calendarOn(STORY_TODAY, t));

/** One row, one day: the size of the card is itself how much year there is. */
export const FirstOfJanuary: Story = storyOf((t) => calendarOn(FIRST_OF_JANUARY, t));

/** Twelve rows, more than the card holds: it scrolls, fades and offers its two dots. */
export const LastDayOfTheYear: Story = storyOf((t) => calendarOn(LAST_DAY_OF_THE_YEAR, t));

/** A player who started this year has no LastYearsTotal to be measured against. */
export const NoLastYearsTotal: Story = storyOf((t) =>
  calendarOn(STORY_TODAY, t, new Date(2026, 1, 3, 12)),
);
