import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { gameProgress } from "../../fixtures/game-progress";
import { buildTimelineDays } from "../../view-models/game-progress";
import { TimelineDayRow } from "./TimelineDayRow";

/** Newest first: the evening of two unlocks, then the one before it. */
const [twoUnlocks, oneUnlock] = buildTimelineDays(gameProgress);

if (!twoUnlocks || !oneUnlock) {
  throw new Error("The game-progress fixture no longer spans two days of unlocks.");
}

const meta = {
  title: "Molecules/TimelineDayRow",
  component: TimelineDayRow,
} satisfies Meta<typeof TimelineDayRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SeveralUnlocks: Story = { args: { day: twoUnlocks } };

export const OneUnlock: Story = { args: { day: oneUnlock } };
