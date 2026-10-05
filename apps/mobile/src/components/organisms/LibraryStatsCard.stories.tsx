import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";
import {
  collectorLibrary,
  countedLibrary,
  landingLibrary,
  playtimeWithheldLibrary,
} from "../../fixtures/library";
import { english, translatorForGlobals } from "../../fixtures/story-locale";
import type { Translate } from "../../i18n/i18n";
import { buildLibrarySummary, type LibraryView } from "../../view-models/library";
import { LibraryStatsCard } from "./LibraryStatsCard";

/** The card as the library screen hands it a view: summary and count read from one library. */
const argsFor = (view: LibraryView, loaded: number | null = null, t: Translate = english) => ({
  summary: buildLibrarySummary(view, t),
  gameCount: view.games.length,
  loaded,
  onOpenStats: fn(),
});

const meta = {
  title: "Organisms/LibraryStatsCard",
  component: LibraryStatsCard,
} satisfies Meta<typeof LibraryStatsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The summary is built by a view-model, before any component renders, so it
 * cannot read the toolbar's language from a provider: it is rebuilt here from
 * the same view in the language the toolbar names (ADR-0023). The args stay
 * English for the controls panel.
 */
const inTheToolbarsLanguage =
  (view: LibraryView, loaded: number | null = null): NonNullable<Story["render"]> =>
  (_args, { globals }) => (
    <LibraryStatsCard {...argsFor(view, loaded, translatorForGlobals(globals))} />
  );

export const Counted: Story = {
  args: argsFor(countedLibrary),
  render: inTheToolbarsLanguage(countedLibrary),
};

/** Tallies are still arriving: the figures grow and the bar says how far they have got. */
export const TalliesLanding: Story = {
  args: argsFor(landingLibrary, 0.5),
  render: inTheToolbarsLanguage(landingLibrary, 0.5),
};

export const PlaytimeWithheld: Story = {
  args: argsFor(playtimeWithheldLibrary),
  render: inTheToolbarsLanguage(playtimeWithheldLibrary),
};

/**
 * The headline's form belongs to the screen, not to the count (ADR-0011), so
 * the story pins the phone: on a wide enough window the same count is written
 * out in full and the name would no longer be true.
 */
export const HeadlineShortened: Story = {
  args: argsFor(collectorLibrary),
  render: inTheToolbarsLanguage(collectorLibrary),
  globals: { viewport: { value: "phone375", isRotated: false } },
};
