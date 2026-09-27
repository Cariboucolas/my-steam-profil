import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { countedLibrary, landingLibrary, playtimeWithheldLibrary } from "../../fixtures/library";
import { buildLibraryRows, type LibraryView } from "../../view-models/library";
import { GameListItem } from "./GameListItem";

const HADES = 1145360;
const ELDEN_RING = 1245620;
const STARDEW_VALLEY = 413150;

const rowIn = (view: LibraryView, appId: number) => {
  const row = buildLibraryRows(view).find((one) => one.appId === appId);
  if (!row) throw new Error(`No game ${appId} in the library fixture.`);
  return row;
};

const meta = {
  title: "Molecules/GameListItem",
  component: GameListItem,
  args: { onPress: fn() },
} satisfies Meta<typeof GameListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Counted: Story = { args: { row: rowIn(countedLibrary, HADES) } };

export const EveryAchievementUnlocked: Story = {
  args: { row: rowIn(countedLibrary, ELDEN_RING) },
};

/** Its tally has been asked for and has not come back: the rate waits in its own space. */
export const TallyPending: Story = {
  args: {
    row: rowIn({ ...landingLibrary, pending: new Set([STARDEW_VALLEY]) }, STARDEW_VALLEY),
  },
};

export const PlaytimeWithheld: Story = {
  args: { row: rowIn(playtimeWithheldLibrary, HADES) },
};
