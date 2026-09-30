import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import { messageFor, type ScreenError } from "../../view-models/api-errors";
import type { Translate } from "../../i18n/i18n";
import { ErrorState } from "./ErrorState";

const meta = {
  title: "Organisms/ErrorState",
  component: ErrorState,
  args: { onRetry: fn() },
} satisfies Meta<typeof ErrorState>;

export default meta;

type Story = StoryObj<typeof meta>;

const storyOf = (
  error: ScreenError,
  extra: { readonly onChangeProfile?: () => void } = {},
): Story => {
  const messageIn = (t: Translate) => ({ message: messageFor(error, t) });
  return {
    args: { ...messageIn(english), ...extra },
    render: inTheToolbarsLanguage(ErrorState, messageIn),
  };
};

/** Another profile may well be public, so the way to one is offered. */
export const PrivateProfile: Story = storyOf("PRIVATE_PROFILE", { onChangeProfile: fn() });

/** A backend that is down is down for every profile: only trying again can help. */
export const BackendUnreachable: Story = storyOf("UNAVAILABLE");
