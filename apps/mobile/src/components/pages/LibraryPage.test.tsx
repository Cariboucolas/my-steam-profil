import type { GameDto, ProfileDto } from "@steam/contracts";
import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { deviceAsksForLessMotion } from "../../accessibility/reduce-motion.test-support";
import type { ApiClient } from "../../api-client/api-client";
import { ApiClientProvider } from "../../api-client/api-client-provider";
import { createFixtureApiClient } from "../../api-client/fixture-api-client";
import { FreshQueries } from "../../query/FreshQueries";
import type { SteamIdStorage } from "../../settings/steam-id-storage";
import { SteamIdProvider } from "../../settings/steam-id-store";
import { LibraryPage } from "./LibraryPage";

const STEAM_ID = "76561197979269357";

const profile: ProfileDto = {
  steamId: STEAM_ID,
  personaName: "cariboucolas",
  avatarUrl: "https://avatars/full.jpg",
  profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}/`,
};

const games: readonly GameDto[] = [
  {
    appId: 2066020,
    name: "Soulstone Survivors",
    playtimeMinutes: 4977,
    iconUrl: "https://icon/2066020.jpg",
    lastPlayedAt: "2026-06-25T12:16:14.000Z",
  },
];

const steamIdStorage: SteamIdStorage = {
  read: () => Promise.resolve(STEAM_ID),
  write: () => Promise.resolve(),
  forget: () => Promise.resolve(),
};

const answering = createFixtureApiClient({ profile, games, progress: {} });
const getProfile = jest.fn(answering.getProfile);
const getGames = jest.fn(answering.getGames);
const client: ApiClient = { ...answering, getProfile, getGames };
const createClient = () => client;

const nowhere = () => {};

const PHONE = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** One cache and one device for as long as it is rendered; the page comes and goes. */
const App = ({ onLibrary }: { readonly onLibrary: boolean }) => (
  <SafeAreaProvider initialMetrics={PHONE}>
    <FreshQueries>
      <SteamIdProvider storage={steamIdStorage}>
        <ApiClientProvider create={createClient}>
          {onLibrary ? <LibraryPage onOpenGame={nowhere} onChangeProfile={nowhere} /> : null}
        </ApiClientProvider>
      </SteamIdProvider>
    </FreshQueries>
  </SafeAreaProvider>
);

describe("LibraryPage", () => {
  beforeEach(deviceAsksForLessMotion);

  /** Lets the tallies still in flight land before the screen is torn down. */
  afterEach(async () => {
    await act(async () => {});
  });

  /**
   * What the cache above the routes is for (#162): the library asked for once
   * is there for whoever shows it next, while it is fresh.
   */
  it("asks nothing again when the reader comes back to a library just loaded", async () => {
    const { rerender } = render(<App onLibrary />);
    await screen.findByText("Soulstone Survivors");

    rerender(<App onLibrary={false} />);
    expect(screen.queryByText("Soulstone Survivors")).toBeNull();
    rerender(<App onLibrary />);

    expect(screen.getByText("Soulstone Survivors")).toBeTruthy();
    await act(async () => {});
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(getGames).toHaveBeenCalledTimes(1);
  });
});
