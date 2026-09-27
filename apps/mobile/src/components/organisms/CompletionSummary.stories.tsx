import type { GameProgressDto } from "@steam/contracts";
import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { PLAYED_GAME } from "../../fixtures/library";
import { buildGameSummary } from "../../view-models/game-progress";
import { CompletionSummary } from "./CompletionSummary";

const progress = (unlocked: number, total: number): GameProgressDto => ({
  completion: {
    unlocked,
    total,
    percentage: total === 0 ? 0 : (unlocked / total) * 100,
  },
  achievements: [],
  timeline: unlocked === 0 ? [] : [{ apiName: "ACH_LAST", unlockedAt: "2026-06-24T21:12:00Z" }],
});

const meta = {
  title: "Organisms/CompletionSummary",
  component: CompletionSummary,
} satisfies Meta<typeof CompletionSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
  args: { summary: buildGameSummary(PLAYED_GAME, progress(38, 49)) },
};

export const EveryAchievementUnlocked: Story = {
  args: { summary: buildGameSummary(PLAYED_GAME, progress(49, 49)) },
};

/** A game that defines nothing to earn, which is not a game at zero. */
export const NoAchievements: Story = {
  args: { summary: buildGameSummary(PLAYED_GAME, progress(0, 0)) },
};

/** The achievements were never fetched, which is not the same as a game defining none. */
export const NotLoaded: Story = {
  args: { summary: buildGameSummary(PLAYED_GAME, null) },
};
