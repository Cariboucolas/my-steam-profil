import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { english } from "../../fixtures/story-locale";
import { STORY_TODAY } from "../../fixtures/today";
import { ONE_UNLOCK_WEEK, typicalWeek } from "../../fixtures/week";
import type { CountedUnlocks } from "../../view-models/unlock-days";
import { buildUnlockWeek } from "../../view-models/unlock-week";
import { HourBars } from "./HourBars";

/** The bars' half of a counted week, in English. */
const barsOf = (view: CountedUnlocks) => {
  const week = buildUnlockWeek(view, true, "en", english, null);
  return week.kind === "drawn"
    ? { hours: week.hours, scale: week.scale }
    : { hours: [], scale: [] };
};

const meta = {
  title: "Molecules/HourBars",
  component: HourBars,
  args: barsOf(typicalWeek(STORY_TODAY)),
} satisfies Meta<typeof HourBars>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TypicalWeek: Story = {};
/** A single unlock: one bar, the rest as slivers. */
export const OneUnlock: Story = { args: barsOf(ONE_UNLOCK_WEEK) };
