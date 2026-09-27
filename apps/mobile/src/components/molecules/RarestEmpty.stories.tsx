import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { RarestEmpty } from "./RarestEmpty";

const meta = {
  title: "Molecules/RarestEmpty",
  component: RarestEmpty,
  args: { anyUnlock: true },
} satisfies Meta<typeof RarestEmpty>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Waiting on the library to finish being counted before anything can be ranked. */
export const CountingTheLibrary: Story = { args: { status: "counting" } };

/** Waiting on the figures Steam publishes. */
export const Ranking: Story = { args: { status: "loading" } };

/** An answer about the player: nothing unlocked anywhere. */
export const NothingUnlocked: Story = { args: { status: "ready", anyUnlock: false } };

/**
 * An answer about Steam, not the player: they hold unlocks, and none has a
 * published Rarity. A Rarity we do not hold is not a Rarity of zero.
 */
export const NoRarityPublished: Story = { args: { status: "ready", anyUnlock: true } };
