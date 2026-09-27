import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { gameProgress } from "../../fixtures/game-progress";
import { buildAchievementRows } from "../../view-models/game-progress";
import { AchievementRow } from "./AchievementRow";

const rowFor = (apiName: string) => {
  const row = buildAchievementRows(gameProgress, "all").find((one) => one.apiName === apiName);
  if (!row) throw new Error(`No achievement ${apiName} in the game-progress fixture.`);
  return row;
};

const meta = {
  title: "Molecules/AchievementRow",
  component: AchievementRow,
} satisfies Meta<typeof AchievementRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unlocked: Story = { args: { row: rowFor("ESCAPE") } };

export const Locked: Story = { args: { row: rowFor("HEAT_32") } };

/** Steam sends no description for an achievement hidden until earned. */
export const HiddenAchievement: Story = { args: { row: rowFor("SECRET") } };
