import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import {
  createFailingApiClient,
  createFixtureApiClient,
  createPendingApiClient,
} from "../../api-client/fixture-api-client";
import { libraryServedOn } from "../../fixtures/api";
import { LIBRARY_GAMES } from "../../fixtures/library";
import { servedBy } from "../../fixtures/served";
import { FIRST_OF_JANUARY, STORY_TODAY } from "../../fixtures/today";
import { LibraryPage } from "./LibraryPage";

/** One client per story, built once: a fresh one each render would restart the load. */
const clientOn = (today: Date, options?: Parameters<typeof libraryServedOn>[1]) => {
  const client = createFixtureApiClient(libraryServedOn(today, options));
  return () => client;
};

const meta = {
  title: "Pages/LibraryPage",
  component: LibraryPage,
  args: { onOpenGame: fn(), onOpenStats: fn(), onChangeProfile: fn(), today: STORY_TODAY },
} satisfies Meta<typeof LibraryPage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The whole library, loaded and counted, as the screen draws it. */
export const Loaded: Story = { decorators: [servedBy(clientOn(STORY_TODAY))] };

/** The same player on 1 January: a calendar one row tall. */
export const FirstOfJanuary: Story = {
  args: { today: FIRST_OF_JANUARY },
  decorators: [servedBy(clientOn(FIRST_OF_JANUARY))],
};

/** A profile whose hours Steam does not publish: the orders over them are not offered. */
export const PlaytimeWithheld: Story = {
  decorators: [
    servedBy(
      clientOn(STORY_TODAY, {
        games: LIBRARY_GAMES.map((game) => ({ ...game, playtimeMinutes: null })),
      }),
    ),
  ],
};

/** The library has been asked for and has not come back. */
export const Loading: Story = {
  decorators: [servedBy(() => createPendingApiClient())],
};

export const PrivateProfile: Story = {
  decorators: [servedBy(() => createFailingApiClient("PRIVATE_PROFILE"))],
};
