import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { calendarOn } from "../../fixtures/calendar";
import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import { STORY_TODAY } from "../../fixtures/today";
import type { Translate } from "../../i18n/i18n";
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

const storyOf = (calendarIn: (t: Translate) => UnlockCalendar): Story => ({
  args: headerOf(calendarIn(english)),
  render: inTheToolbarsLanguage(UnlockCalendarHeader, (t) => headerOf(calendarIn(t))),
});

/** The running year against the whole of the one before it, deliberately unequal. */
export const AgainstLastYearsTotal: Story = storyOf((t) => calendarOn(STORY_TODAY, t));

/** A player who was not there last year has nothing to be measured against. */
export const NoLastYearsTotal: Story = storyOf((t) =>
  calendarOn(STORY_TODAY, t, new Date(2026, 1, 3, 12)),
);
