import { err } from "@steam/domain";
import { act, fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";
import { Text } from "react-native";

import LibraryScreen from "../../app/index";
import StatsScreen from "../../app/stats";
import { deviceAsksForLessMotion } from "../accessibility/reduce-motion.test-support";
import type { ApiClient } from "../api-client/api-client";
import { createFixtureApiClient } from "../api-client/fixture-api-client";
import { RECORD_FIGURE_SKELETON_TEST_ID } from "../components/molecules/RecordFigure";
import { YEARS_CARD_TEST_ID } from "../components/organisms/YearsCumulativeCard";
import { libraryServedOn } from "../fixtures/api";
import { LIBRARY_GAMES } from "../fixtures/library";
import { FIXTURE_PROFILE } from "../fixtures/profile";
import { STORY_TODAY } from "../fixtures/today";
import { FreshQueries } from "../query/FreshQueries";
import type { SteamIdStorage } from "../settings/steam-id-storage";
import { SteamIdProvider, useSteamId } from "../settings/steam-id-store";

const STEAM_ID = FIXTURE_PROFILE.steamId;
const OTHER_STEAM_ID = "76561197960287930";

let mockClients: Readonly<Record<string, ApiClient>> = {};

/** The transport is replaced and nothing above it is, as in the library's screen test. */
jest.mock("../api-client", () => ({
  createApiClient: (steamId: string) => mockClients[steamId],
}));

const storage = (stored?: string): SteamIdStorage => ({
  read: () => Promise.resolve(stored),
  write: () => Promise.resolve(),
  forget: () => Promise.resolve(),
});

const SetupStub = () => <Text>setup screen</Text>;
const GameStub = () => <Text>game screen</Text>;

/** Chooses another profile while the screen is up, as the setup screen would. */
const ProfileSwitch = () => {
  const { remember } = useSteamId();
  return (
    <Text accessibilityRole="button" onPress={() => void remember(OTHER_STEAM_ID)}>
      switch
    </Text>
  );
};

const renderAt = (clients: Readonly<Record<string, ApiClient>>, initialUrl: "/" | "/stats") => {
  mockClients = clients;
  return renderRouter(
    { index: LibraryScreen, stats: StatsScreen, setup: SetupStub, "game/[appId]": GameStub },
    {
      initialUrl,
      wrapper: ({ children }) => (
        <FreshQueries>
          <SteamIdProvider storage={storage(STEAM_ID)}>
            {children}
            <ProfileSwitch />
          </SteamIdProvider>
        </FreshQueries>
      ),
    },
  );
};

const served = (): ApiClient => createFixtureApiClient(libraryServedOn(STORY_TODAY));

/**
 * Waits until the library is counted through: the card is up and its records
 * stop being skeletons. A screen still loading has no skeletons either.
 */
const recordsShown = () =>
  waitFor(() => {
    expect(screen.getByTestId(YEARS_CARD_TEST_ID)).toBeTruthy();
    expect(screen.queryAllByTestId(RECORD_FIGURE_SKELETON_TEST_ID)).toHaveLength(0);
  });

/** The chart's one sentence, which carries the total and the span. */
const chartSentence = (): string | undefined =>
  screen.getByLabelText(/dated unlock/).props.accessibilityLabel;

/** What the chart says for a library served by `client` alone, counted through. */
const sentenceServedBy = async (client: ApiClient): Promise<string | undefined> => {
  const { unmount } = renderAt({ [STEAM_ID]: client }, "/stats");
  await recordsShown();
  const sentence = chartSentence();
  unmount();
  return sentence;
};

describe("stats screen", () => {
  beforeEach(deviceAsksForLessMotion);
  afterEach(async () => {
    await act(async () => {});
  });

  it("draws the years card, then its records once the library is counted", async () => {
    renderAt({ [STEAM_ID]: served() }, "/stats");
    expect(await screen.findByTestId(YEARS_CARD_TEST_ID)).toBeTruthy();
    await recordsShown();
    expect(screen.getByLabelText(/^best month/)).toBeTruthy();
  });

  it("offers a retry when the profile cannot be loaded", async () => {
    const client = served();
    // Asked once, and once more by itself before it gives up (#162).
    const getProfile = jest
      .fn(client.getProfile)
      .mockResolvedValueOnce(err("UNAVAILABLE"))
      .mockResolvedValueOnce(err("UNAVAILABLE"));
    renderAt({ [STEAM_ID]: { ...client, getProfile } }, "/stats");

    fireEvent.press(await screen.findByLabelText("Try again"));
    expect(await screen.findByTestId(YEARS_CARD_TEST_ID)).toBeTruthy();
  });

  it("leaves a failed game out, and counts the others", async () => {
    const [first] = LIBRARY_GAMES;
    if (first === undefined) throw new Error("the fixture library has games");
    const failing = first.appId;
    const withoutIt = await sentenceServedBy(
      createFixtureApiClient(libraryServedOn(STORY_TODAY, { except: [failing] })),
    );
    const everything = await sentenceServedBy(served());

    const client = served();
    const getGameTally: ApiClient["getGameTally"] = (appId, signal) =>
      appId === failing ? Promise.resolve(err("NOT_FOUND")) : client.getGameTally(appId, signal);
    renderAt({ [STEAM_ID]: { ...client, getGameTally } }, "/stats");
    await recordsShown();

    expect(chartSentence()).toBe(withoutIt);
    expect(chartSentence()).not.toBe(everything);
  });

  it("recounts for another profile, with nothing of the previous one", async () => {
    // Another library, dated up to another day: its total and its span both differ.
    const other = () =>
      createFixtureApiClient(
        libraryServedOn(new Date(2022, 5, 15), { games: LIBRARY_GAMES.slice(0, 3) }),
      );
    const expected = await sentenceServedBy(other());

    renderAt({ [STEAM_ID]: served(), [OTHER_STEAM_ID]: other() }, "/stats");
    await recordsShown();
    const before = chartSentence();
    expect(before).not.toBe(expected);

    fireEvent.press(screen.getByText("switch"));
    await waitFor(() => expect(chartSentence()).not.toBe(before));
    await recordsShown();
    expect(chartSentence()).toBe(expected);
  });

  it("asks nothing more for the stats once the library has counted them", async () => {
    const client = served();
    const getGameTally = jest.fn(client.getGameTally);
    renderAt({ [STEAM_ID]: { ...client, getGameTally } }, "/");

    // The first visit finishes the count the library started.
    fireEvent.press(await screen.findByText("Statistics ›"));
    await recordsShown();
    const asked = getGameTally.mock.calls.length;

    fireEvent.press(screen.getByLabelText("Back to library"));
    fireEvent.press(await screen.findByText("Statistics ›"));
    await recordsShown();
    expect(getGameTally.mock.calls.length).toBe(asked);
  });

  it("goes back to the library when it is the only screen", async () => {
    renderAt({ [STEAM_ID]: served() }, "/stats");
    fireEvent.press(await screen.findByLabelText("Back to library"));
    expect(await screen.findByText("Statistics ›")).toBeTruthy();
  });
});
