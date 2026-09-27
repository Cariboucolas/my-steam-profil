import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { PLAYED_GAME, UNDISCLOSED_GAME } from "../../fixtures/library";
import { buildGameSummary } from "../../view-models/game-progress";
import { GameHero } from "./GameHero";

const meta = {
  title: "Organisms/GameHero",
  component: GameHero,
  // The gallery draws no status bar, so there is no inset for the hero to clear.
  args: { topInset: 0, onBack: fn() },
} satisfies Meta<typeof GameHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Played: Story = {
  args: {
    appId: PLAYED_GAME.appId,
    name: PLAYED_GAME.name,
    meta: buildGameSummary(PLAYED_GAME, null).meta,
  },
};

/** Steam gives neither the hours nor a last-played date, so no figure line is drawn. */
export const PlaytimeWithheld: Story = {
  args: {
    appId: UNDISCLOSED_GAME.appId,
    name: UNDISCLOSED_GAME.name,
    meta: buildGameSummary(UNDISCLOSED_GAME, null).meta,
  },
};
