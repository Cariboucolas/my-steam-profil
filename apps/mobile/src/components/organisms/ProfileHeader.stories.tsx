import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";

import { FIXTURE_PROFILE as profile } from "../../fixtures/profile";
import { ProfileHeader } from "./ProfileHeader";

const meta = {
  title: "Organisms/ProfileHeader",
  component: ProfileHeader,
  args: { profile, gameCount: 267, onChangeProfile: fn() },
} satisfies Meta<typeof ProfileHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The Revision as `main` publishes it: the commit alone (ADR-0016). */
export const Live: Story = { args: { revision: "9cd27dc" } };

/** A pull request's preview: deployed, but not live. */
export const Preview: Story = { args: { revision: "dev 9cd27dc" } };

/** A developer's machine, with no commit to name. */
export const Local: Story = { args: { revision: "dev" } };

export const LongPersonaName: Story = {
  args: {
    revision: "9cd27dc",
    profile: { ...profile, personaName: "The Unnamed Wanderer of the Lands Between" },
  },
};
