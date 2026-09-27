import type { Meta, StoryObj } from "@storybook/react-native-web-vite";

import {
  collectorLibrary,
  countedLibrary,
  landingLibrary,
  playtimeWithheldLibrary,
} from "../../fixtures/library";
import { buildLibrarySummary, type LibraryView } from "../../view-models/library";
import { LibraryStatsCard } from "./LibraryStatsCard";

/** The card as the library screen hands it a view: summary and count read from one library. */
const argsFor = (view: LibraryView, loaded: number | null = null) => ({
  summary: buildLibrarySummary(view),
  gameCount: view.games.length,
  loaded,
});

const meta = {
  title: "Organisms/LibraryStatsCard",
  component: LibraryStatsCard,
} satisfies Meta<typeof LibraryStatsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Counted: Story = { args: argsFor(countedLibrary) };

/** Tallies are still arriving: the figures grow and the bar says how far they have got. */
export const TalliesLanding: Story = { args: argsFor(landingLibrary, 0.5) };

export const PlaytimeWithheld: Story = { args: argsFor(playtimeWithheldLibrary) };

/**
 * The headline's form belongs to the screen, not to the count (ADR-0011), so
 * the story pins the phone: on a wide enough window the same count is written
 * out in full and the name would no longer be true.
 */
export const HeadlineShortened: Story = {
  args: argsFor(collectorLibrary),
  globals: { viewport: { value: "phone375", isRotated: false } },
};
