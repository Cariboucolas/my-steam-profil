import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { LIBRARY_GAMES, unlockingLibrary } from "../../fixtures/library";
import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import { STORY_TODAY } from "../../fixtures/today";
import type { Translate } from "../../i18n/i18n";
import type { CountedUnlocks } from "../../view-models/unlock-days";
import { buildYearsAndCumulative } from "../../view-models/years-and-cumulative";
import { YearsCumulativeCard } from "./YearsCumulativeCard";

/** How far a library still counting has got, in the stories that show one. */
const STILL_COUNTING = 0.6;
const NOTHING_DATED: CountedUnlocks = { games: LIBRARY_GAMES, tallies: {} };
const SINCE_2019 = unlockingLibrary(STORY_TODAY, new Date(2019, 0, 1));
const THIS_YEAR_ONLY = unlockingLibrary(STORY_TODAY, new Date(2026, 0, 1));
const SINCE_2008 = unlockingLibrary(STORY_TODAY, new Date(2008, 0, 1));

/** The card as the stats page hands it one, in the language `t` speaks. */
const yearsOf = (view: CountedUnlocks, counted: boolean) => (t: Translate) => ({
  years: buildYearsAndCumulative(view, counted, STORY_TODAY, t),
  // Part way through while counting, as the page's one load reports it.
  loaded: counted ? null : STILL_COUNTING,
});

const meta = {
  title: "Organisms/YearsCumulativeCard",
  component: YearsCumulativeCard,
  args: yearsOf(SINCE_2019, true)(english),
} satisfies Meta<typeof YearsCumulativeCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Counted: Story = {
  render: inTheToolbarsLanguage(YearsCumulativeCard, yearsOf(SINCE_2019, true)),
};
export const StillCounting: Story = {
  render: inTheToolbarsLanguage(YearsCumulativeCard, yearsOf(SINCE_2019, false)),
};
export const SingleYear: Story = {
  render: inTheToolbarsLanguage(YearsCumulativeCard, yearsOf(THIS_YEAR_ONLY, true)),
};
export const LongSpan: Story = {
  render: inTheToolbarsLanguage(YearsCumulativeCard, yearsOf(SINCE_2008, true)),
};
export const Waiting: Story = {
  render: inTheToolbarsLanguage(YearsCumulativeCard, yearsOf(NOTHING_DATED, false)),
};
export const Empty: Story = {
  render: inTheToolbarsLanguage(YearsCumulativeCard, yearsOf(NOTHING_DATED, true)),
};
