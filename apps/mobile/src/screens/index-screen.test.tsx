import type { GameDto, ProfileDto } from "@steam/contracts";
import { renderRouter, screen, waitFor } from "expo-router/testing-library";
import { Text } from "react-native";

import type { ApiClient } from "../api-client/api-client";
import { createFixtureApiClient } from "../api-client/fixture-api-client";
import { UNLOCK_CALENDAR_CARD_TEST_ID } from "../components/organisms/UnlockCalendarCard";
import type { SteamIdStorage } from "../settings/steam-id-storage";
import { SteamIdProvider } from "../settings/steam-id-store";
import LibraryScreen from "../../app/index";

const STEAM_ID = "76561197979269357";

let mockClient: ApiClient | undefined;

jest.mock("../api-client/use-api-client", () => ({
  useApiClient: () => mockClient,
}));

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
    playtimeLabel: "83 h 57",
    iconUrl: "https://icon/2066020.jpg",
    lastPlayedAt: "2026-06-25T12:16:14.000Z",
  },
];

const storage = (stored?: string): SteamIdStorage => ({
  read: () => Promise.resolve(stored),
  write: () => Promise.resolve(),
  forget: () => Promise.resolve(),
});

const Stub = () => <Text>elsewhere</Text>;

const renderLibrary = (client: ApiClient | undefined, stored = STEAM_ID) => {
  mockClient = client;
  return renderRouter(
    { index: LibraryScreen, setup: Stub, "game/[appId]": Stub },
    {
      initialUrl: "/",
      wrapper: ({ children }) => (
        <SteamIdProvider storage={storage(stored)}>{children}</SteamIdProvider>
      ),
    },
  );
};

describe("library screen", () => {
  /**
   * #41 asked that the unlock calendar is never hidden or replaced with a
   * message. The card is mounted unconditionally, so the criterion holds by
   * construction — and held unwitnessed until this. Wrap the card in a
   * condition and this goes red.
   */
  it("shows the unlock calendar for a library with nothing unlocked", async () => {
    renderLibrary(createFixtureApiClient({ profile, games, progress: {} }));

    await waitFor(() =>
      expect(screen.getByTestId(UNLOCK_CALENDAR_CARD_TEST_ID)).toBeTruthy(),
    );
  });
});
