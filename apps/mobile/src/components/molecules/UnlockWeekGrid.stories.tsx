import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { english } from "../../fixtures/story-locale";
import { STORY_TODAY } from "../../fixtures/today";
import { ONE_UNLOCK_WEEK, typicalWeek } from "../../fixtures/week";
import type { CountedUnlocks } from "../../view-models/unlock-days";
import { buildUnlockWeek } from "../../view-models/unlock-week";
import { UnlockWeekGrid } from "./UnlockWeekGrid";

/** The grid's half of a counted week, in English. */
const gridOf = (view: CountedUnlocks) => {
  const week = buildUnlockWeek(view, true, "en", english, null);
  return week.kind === "drawn"
    ? { rows: week.rows, legend: week.legend }
    : { rows: [], legend: [] };
};

const meta = {
  title: "Molecules/UnlockWeekGrid",
  component: UnlockWeekGrid,
  args: gridOf(typicalWeek(STORY_TODAY)),
} satisfies Meta<typeof UnlockWeekGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TypicalWeek: Story = {};
/** A single unlock: one slot in the darkest tone it can take. */
export const OneUnlock: Story = { args: gridOf(ONE_UNLOCK_WEEK) };
