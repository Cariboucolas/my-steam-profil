import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { gameProgress } from "../../fixtures/game-progress";
import { english, inTheToolbarsLanguage } from "../../fixtures/story-locale";
import type { Translate } from "../../i18n/i18n";
import { buildTimelineDays } from "../../view-models/game-progress";
import { TimelineDayRow } from "./TimelineDayRow";

/** Newest first: the evening of two unlocks, then the one before it. */
const daysIn = (t: Translate) => {
  const [twoUnlocks, oneUnlock] = buildTimelineDays(gameProgress, t);

  if (!twoUnlocks || !oneUnlock) {
    throw new Error("The game-progress fixture no longer spans two days of unlocks.");
  }
  return { twoUnlocks, oneUnlock };
};

const meta = {
  title: "Molecules/TimelineDayRow",
  component: TimelineDayRow,
} satisfies Meta<typeof TimelineDayRow>;

export default meta;

type Story = StoryObj<typeof meta>;

const storyOf = (which: keyof ReturnType<typeof daysIn>): Story => ({
  args: { day: daysIn(english)[which] },
  render: inTheToolbarsLanguage(TimelineDayRow, (t) => ({ day: daysIn(t)[which] })),
});

export const SeveralUnlocks: Story = storyOf("twoUnlocks");

export const OneUnlock: Story = storyOf("oneUnlock");
