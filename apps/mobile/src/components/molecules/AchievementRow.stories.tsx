import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { gameProgress } from "../../fixtures/game-progress";
import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import type { Translate } from "../../i18n/i18n";
import { buildAchievementRows } from "../../view-models/game-progress";
import { AchievementRow } from "./AchievementRow";

const rowFor = (apiName: string, t: Translate) => {
  const row = buildAchievementRows(gameProgress, "all", t).find((one) => one.apiName === apiName);
  if (!row) throw new Error(`No achievement ${apiName} in the game-progress fixture.`);
  return row;
};

const storyOf = (apiName: string): Story => ({
  args: { row: rowFor(apiName, english) },
  render: inTheToolbarsLanguage(AchievementRow, (t) => ({ row: rowFor(apiName, t) })),
});

const meta = {
  title: "Molecules/AchievementRow",
  component: AchievementRow,
} satisfies Meta<typeof AchievementRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unlocked: Story = storyOf("ESCAPE");

export const Locked: Story = storyOf("HEAT_32");

/** Steam sends no description for an achievement hidden until earned. */
export const HiddenAchievement: Story = storyOf("SECRET");
