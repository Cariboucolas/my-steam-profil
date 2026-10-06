import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import { unlockingLibrary } from "../../fixtures/library";
import { english } from "../../fixtures/story-locale";
import { STORY_TODAY } from "../../fixtures/today";
import { buildYearsAndCumulative } from "../../view-models/years-and-cumulative";
import { YearBars } from "./YearBars";

/** The bars a player unlocking every day since `since` gets, as the card builds them. */
const argsSince = (since: Date) => {
  const card = buildYearsAndCumulative(
    unlockingLibrary(STORY_TODAY, since),
    true,
    STORY_TODAY,
    english,
  );
  if (card.kind !== "drawn") throw new Error("the fixture library has dated unlocks");
  return {
    bars: card.bars,
    cumulative: card.cumulative,
    scale: card.scale,
    screenReaderLabel: card.screenReaderLabel,
  };
};

const meta = {
  title: "Molecules/YearBars",
  component: YearBars,
  args: argsSince(new Date(2019, 0, 1)),
} satisfies Meta<typeof YearBars>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SinceTwentyNineteen: Story = {};
export const SingleYear: Story = { args: argsSince(new Date(2026, 0, 1)) };
export const LongSpan: Story = { args: argsSince(new Date(2008, 0, 1)) };
