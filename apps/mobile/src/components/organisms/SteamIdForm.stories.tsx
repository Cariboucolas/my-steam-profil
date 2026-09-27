import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { SteamIdForm } from "./SteamIdForm";

const meta = {
  title: "Organisms/SteamIdForm",
  component: SteamIdForm,
  // Refuses whatever is typed, so the gallery can show the refusal without a backend.
  args: { onSubmit: fn(async () => false) },
} satisfies Meta<typeof SteamIdForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/** No profile stored yet: nothing to go back to, nothing to forget. */
export const FirstVisit: Story = {};

export const ChangingProfile: Story = {
  args: { onCancel: fn(), onForget: fn() },
};
