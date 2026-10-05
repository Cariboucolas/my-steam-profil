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
import { StatsPage } from "./StatsPage";

/** One client per story, built once: a fresh one each render would restart the load. */
const clientOn = (today: Date) => {
  const client = createFixtureApiClient(libraryServedOn(today));
  return () => client;
};

const meta = {
  title: "Pages/StatsPage",
  component: StatsPage,
  args: { onBack: fn(), onChangeProfile: fn(), today: STORY_TODAY },
} satisfies Meta<typeof StatsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The whole library, loaded and counted, as the stats screen draws it. */
export const Counted: Story = { decorators: [servedBy(clientOn(STORY_TODAY))] };

export const Loading: Story = { decorators: [servedBy(() => createPendingApiClient())] };

export const Failed: Story = {
  decorators: [servedBy(() => createFailingApiClient("UNAVAILABLE"))],
};
