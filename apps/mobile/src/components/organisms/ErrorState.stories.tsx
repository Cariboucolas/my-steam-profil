import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { messageFor } from "../../view-models/api-errors";
import { ErrorState } from "./ErrorState";

const meta = {
  title: "Organisms/ErrorState",
  component: ErrorState,
  args: { onRetry: fn() },
} satisfies Meta<typeof ErrorState>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Another profile may well be public, so the way to one is offered. */
export const PrivateProfile: Story = {
  args: { message: messageFor("PRIVATE_PROFILE"), onChangeProfile: fn() },
};

/** A backend that is down is down for every profile: only trying again can help. */
export const BackendUnreachable: Story = {
  args: { message: messageFor("UNAVAILABLE") },
};
