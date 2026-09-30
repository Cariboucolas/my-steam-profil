import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { PLAYED_GAME, UNDISCLOSED_GAME } from "../../fixtures/library";
import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import type { Translate } from "../../i18n/i18n";
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

const storyOf = (game: typeof PLAYED_GAME): Story => {
  const metaIn = (t: Translate) => ({ meta: buildGameSummary(game, null, t).meta });
  return {
    args: { appId: game.appId, name: game.name, ...metaIn(english) },
    render: inTheToolbarsLanguage(GameHero, metaIn),
  };
};

export const Played: Story = storyOf(PLAYED_GAME);

/** Steam gives neither the hours nor a last-played date, so no figure line is drawn. */
export const PlaytimeWithheld: Story = storyOf(UNDISCLOSED_GAME);
