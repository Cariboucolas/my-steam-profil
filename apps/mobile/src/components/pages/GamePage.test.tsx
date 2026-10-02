import type { GameDto, GameProgressDto, ProfileDto } from "@steam/contracts";
import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { deviceAsksForLessMotion } from "../../accessibility/reduce-motion.test-support";
import type { ApiClient } from "../../api-client/api-client";
import { ApiClientProvider } from "../../api-client/api-client-provider";
import { createFixtureApiClient } from "../../api-client/fixture-api-client";
import { FreshQueries } from "../../query/FreshQueries";
import type { SteamIdStorage } from "../../settings/steam-id-storage";
import { SteamIdProvider } from "../../settings/steam-id-store";
import { GamePage } from "./GamePage";
import { LibraryPage } from "./LibraryPage";

const STEAM_ID = "76561197979269357";
const SOULSTONE = 2066020;

const profile: ProfileDto = {
  steamId: STEAM_ID,
  personaName: "cariboucolas",
  avatarUrl: "https://avatars/full.jpg",
  profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}/`,
};

const games: readonly GameDto[] = [
  {
    appId: SOULSTONE,
    name: "Soulstone Survivors",
    playtimeMinutes: 4977,
    iconUrl: "https://icon/2066020.jpg",
    lastPlayedAt: "2026-06-25T12:16:14.000Z",
  },
];

/** A game Steam defines no achievements for, which the page says in so many words. */
const barren: GameProgressDto = {
  completion: { unlocked: 0, total: 0, percentage: 0 },
  achievements: [],
  timeline: [],
};

const NO_ACHIEVEMENTS = "This game has no achievements";

const steamIdStorage: SteamIdStorage = {
  read: () => Promise.resolve(STEAM_ID),
  write: () => Promise.resolve(),
  forget: () => Promise.resolve(),
};

const answering = createFixtureApiClient({ profile, games, progress: { [SOULSTONE]: barren } });
const getGames = jest.fn(answering.getGames);
const getGameProgress = jest.fn(answering.getGameProgress);
const client: ApiClient = { ...answering, getGames, getGameProgress };
const createClient = () => client;

const nowhere = () => {};

const PHONE = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

type Shown = "library" | "game" | "nothing";

/** One cache and one device for as long as it is rendered; the pages come and go. */
const App = ({ shown }: { readonly shown: Shown }) => (
  <SafeAreaProvider initialMetrics={PHONE}>
    <FreshQueries>
      <SteamIdProvider storage={steamIdStorage}>
        <ApiClientProvider create={createClient}>
          {shown === "library" && <LibraryPage onOpenGame={nowhere} onChangeProfile={nowhere} />}
          {shown === "game" && (
            <GamePage appId={SOULSTONE} onBack={nowhere} onChangeProfile={nowhere} />
          )}
        </ApiClientProvider>
      </SteamIdProvider>
    </FreshQueries>
  </SafeAreaProvider>
);

describe("GamePage", () => {
  beforeEach(() => {
    deviceAsksForLessMotion();
    getGames.mockClear();
    getGameProgress.mockClear();
  });

  /** Lets what is still in flight land before the screen is torn down. */
  afterEach(async () => {
    await act(async () => {});
  });

  /** What the cache above the routes is for (#162): the library already holds the Games. */
  it("asks only for the progress when it is opened from a library just loaded", async () => {
    const { rerender } = render(<App shown="library" />);
    await screen.findByText("Soulstone Survivors");

    rerender(<App shown="game" />);

    await screen.findByText(NO_ACHIEVEMENTS);
    expect(getGames).toHaveBeenCalledTimes(1);
    expect(getGameProgress).toHaveBeenCalledTimes(1);
  });

  /** The game view is not cached (ADR-0005). */
  it("asks for the progress again each time the game is opened", async () => {
    const { rerender } = render(<App shown="game" />);
    await screen.findByText(NO_ACHIEVEMENTS);

    rerender(<App shown="nothing" />);
    rerender(<App shown="game" />);

    expect(screen.queryByText(NO_ACHIEVEMENTS)).toBeNull();
    await screen.findByText(NO_ACHIEVEMENTS);
    expect(getGameProgress).toHaveBeenCalledTimes(2);
    expect(getGames).toHaveBeenCalledTimes(1);
  });
});
