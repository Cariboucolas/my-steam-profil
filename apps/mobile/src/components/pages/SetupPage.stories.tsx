import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { createPendingApiClient } from "../../api-client/fixture-api-client";
import { servedBy } from "../../fixtures/served";
import { SetupPage } from "./SetupPage";

/** The setup page asks the API nothing; what differs between its states is the device. */
const noApi = () => createPendingApiClient();

const meta = {
  title: "Pages/SetupPage",
  component: SetupPage,
  args: { onLeave: fn() },
} satisfies Meta<typeof SetupPage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing stored on the device: no way back, nothing to forget. */
export const FirstVisit: Story = { decorators: [servedBy(noApi, null)] };

/** A profile is stored: the reader can go back to it, or forget it. */
export const ChangingProfile: Story = { decorators: [servedBy(noApi)] };
