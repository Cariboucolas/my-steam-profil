import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import {
  createFailingApiClient,
  createFixtureApiClient,
  createPendingApiClient,
} from "../../api-client/fixture-api-client";
import { libraryServedOn } from "../../fixtures/api";
import { servedBy } from "../../fixtures/served";
import { STORY_TODAY } from "../../fixtures/today";
import { GamePage } from "./GamePage";

const HADES = 1145360;
const STARDEW_VALLEY = 413150;

/** Built once, so every render of the story is answered by the same client. */
const served = createFixtureApiClient(libraryServedOn(STORY_TODAY));
const neverLoaded = createFixtureApiClient(
  libraryServedOn(STORY_TODAY, { except: [STARDEW_VALLEY] }),
);

const meta = {
  title: "Pages/GamePage",
  component: GamePage,
  args: { appId: HADES, onBack: fn(), onChangeProfile: fn() },
  decorators: [servedBy(() => served)],
} satisfies Meta<typeof GamePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

/** In the library, but its achievements were never fetched: not a failure. */
export const AchievementsNotLoaded: Story = {
  args: { appId: STARDEW_VALLEY },
  decorators: [servedBy(() => neverLoaded)],
};

/** The backend answers for any appId, so a game outside the library is refused here (ADR-0004). */
export const NotInTheLibrary: Story = { args: { appId: 999_999 } };

/** The address named no game at all. */
export const NotAGameId: Story = { args: { appId: Number.NaN } };

export const Loading: Story = {
  decorators: [servedBy(() => createPendingApiClient())],
};

export const BackendUnreachable: Story = {
  decorators: [servedBy(() => createFailingApiClient("UNAVAILABLE"))],
};
