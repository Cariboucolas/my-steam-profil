import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";
import { countedLibrary, landingLibrary, playtimeWithheldLibrary } from "../../fixtures/library";
import { english, translatorForGlobals } from "../../fixtures/story-locale";
import type { Translate } from "../../i18n/i18n";
import { buildLibraryRows, type LibraryView } from "../../view-models/library";
import { GameListItem } from "./GameListItem";

const HADES = 1145360;
const ELDEN_RING = 1245620;
const STARDEW_VALLEY = 413150;

const rowIn = (view: LibraryView, appId: number, t: Translate) => {
  const row = buildLibraryRows(view, t).find((one) => one.appId === appId);
  if (!row) throw new Error(`No game ${appId} in the library fixture.`);
  return row;
};

const meta = {
  title: "Molecules/GameListItem",
  component: GameListItem,
  args: { onPress: fn() },
} satisfies Meta<typeof GameListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The row is built by a view-model before any component renders, so it is
 * rebuilt here in the language the toolbar names (ADR-0023); the args stay
 * English for the controls panel.
 */
const inTheToolbarsLanguage =
  (view: LibraryView, appId: number): NonNullable<Story["render"]> =>
  (args, { globals }) => (
    <GameListItem {...args} row={rowIn(view, appId, translatorForGlobals(globals))} />
  );

const storyOf = (view: LibraryView, appId: number): Story => ({
  args: { row: rowIn(view, appId, english) },
  render: inTheToolbarsLanguage(view, appId),
});

export const Counted: Story = storyOf(countedLibrary, HADES);

export const EveryAchievementUnlocked: Story = storyOf(countedLibrary, ELDEN_RING);

/** Its tally has been asked for and has not come back: the rate waits in its own space. */
const waiting = { ...landingLibrary, pending: new Set([STARDEW_VALLEY]) };
export const TallyPending: Story = storyOf(waiting, STARDEW_VALLEY);

export const PlaytimeWithheld: Story = storyOf(playtimeWithheldLibrary, HADES);
