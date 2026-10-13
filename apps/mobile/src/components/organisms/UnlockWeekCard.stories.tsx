import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { LIBRARY_GAMES } from "../../fixtures/library";
import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import { STORY_TODAY } from "../../fixtures/today";
import { ONE_UNLOCK_WEEK, typicalWeek } from "../../fixtures/week";
import type { Translate } from "../../i18n/i18n";
import type { Locale } from "../../i18n/locale";
import type { CountedUnlocks } from "../../view-models/unlock-days";
import { buildUnlockWeek } from "../../view-models/unlock-week";
import { UnlockWeekCard } from "./UnlockWeekCard";

const STILL_COUNTING = 0.6;
const TYPICAL = typicalWeek(STORY_TODAY);
const NOTHING_DATED: CountedUnlocks = { games: LIBRARY_GAMES, tallies: {} };

const weekOf = (view: CountedUnlocks, counted: boolean) => (t: Translate, locale: Locale) => ({
  week: buildUnlockWeek(view, counted, locale, t, null),
  loaded: counted ? null : STILL_COUNTING,
});

const meta = {
  title: "Organisms/UnlockWeekCard",
  component: UnlockWeekCard,
  args: weekOf(TYPICAL, true)(english, "en"),
} satisfies Meta<typeof UnlockWeekCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Counted: Story = {
  render: inTheToolbarsLanguage(UnlockWeekCard, weekOf(TYPICAL, true)),
};
export const StillCounting: Story = {
  render: inTheToolbarsLanguage(UnlockWeekCard, weekOf(TYPICAL, false)),
};
export const OneUnlock: Story = {
  render: inTheToolbarsLanguage(UnlockWeekCard, weekOf(ONE_UNLOCK_WEEK, true)),
};
export const NothingDated: Story = {
  render: inTheToolbarsLanguage(UnlockWeekCard, weekOf(NOTHING_DATED, true)),
};
export const Waiting: Story = {
  render: inTheToolbarsLanguage(UnlockWeekCard, weekOf(NOTHING_DATED, false)),
};
