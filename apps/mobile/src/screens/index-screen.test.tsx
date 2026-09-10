import type { AchievementDto, GameDto, GameProgressDto, ProfileDto } from "@steam/contracts";
import { err } from "@steam/domain";
import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";
import { Text } from "react-native";

import { deviceAsksForLessMotion } from "../accessibility/reduce-motion.test-support";
import type { ApiClient, ApiError } from "../api-client/api-client";
import { createFixtureApiClient } from "../api-client/fixture-api-client";
import { UNLOCK_CALENDAR_CARD_TEST_ID } from "../components/organisms/UnlockCalendarCard";
import type { SteamIdStorage } from "../settings/steam-id-storage";
import { SteamIdProvider, useSteamId } from "../settings/steam-id-store";
import LibraryScreen from "../../app/index";

const STEAM_ID = "76561197979269357";
const OTHER_STEAM_ID = "76561197960287930";

let mockClients: Readonly<Record<string, ApiClient>> = {};

/**
 * The transport is replaced and nothing above it is. useApiClient stays real —
 * it is memoised on the steam id, and that memoisation is what makes a profile
 * switch hand the screen a different client at all.
 */
jest.mock("../api-client", () => ({
  createApiClient: (steamId: string) => mockClients[steamId],
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

const library = (): ApiClient =>
  createFixtureApiClient({ profile, games, progress: {} });

/** Two games whose order differs by whichever sort is asked for. */
const shelf: readonly GameDto[] = [
  ...games,
  {
    appId: 440,
    name: "Team Fortress 2",
    playtimeMinutes: 405,
    playtimeLabel: "6 h 45",
    iconUrl: "https://icon/440.jpg",
    lastPlayedAt: "2026-08-01T09:00:00.000Z",
  },
];

const shelved = (): ApiClient =>
  createFixtureApiClient({ profile, games: shelf, progress: {} });

/** The names the list is drawing, in the order it draws them. */
const drawnNames = (): readonly string[] =>
  screen.getAllByText(/Survivors|Fortress/).map((node) => String(node.children[0]));

/** Every call refuses, which is what a backend that is down looks like. */
const refusing = (error: ApiError): ApiClient => {
  const refusal = () => Promise.resolve(err(error));
  return {
    getProfile: refusal,
    getGames: refusal,
    getGameProgress: refusal,
    getGameTally: refusal,
    getGameRarity: refusal,
    getAchievementNames: refusal,
  };
};

/** Down when first asked, up when asked again — what a retry is for. */
const downThenUp = (): ApiClient => {
  const up = library();
  let asked = 0;
  return {
    ...up,
    getProfile: () => {
      asked += 1;
      return asked === 1 ? Promise.resolve(err("UNAVAILABLE")) : up.getProfile();
    },
  };
};

const achievement = (apiName: string, unlockedAt: string | null): AchievementDto => ({
  apiName,
  displayName: apiName,
  description: "",
  hidden: false,
  icon: "https://icon/a.jpg",
  iconGray: "https://icon/a_gray.jpg",
  unlocked: true,
  unlockedAt,
});

const played: GameProgressDto = {
  completion: { unlocked: 2, total: 4, percentage: 50 },
  achievements: [
    achievement("BOSS_1", "2026-06-01T10:00:00.000Z"),
    achievement("BOSS_2", "2026-06-02T10:00:00.000Z"),
  ],
  timeline: [
    { apiName: "BOSS_1", unlockedAt: "2026-06-01T10:00:00.000Z" },
    { apiName: "BOSS_2", unlockedAt: "2026-06-02T10:00:00.000Z" },
  ],
};

/** A library Steam publishes figures for, so the ranking has something to rank. */
const ranked = (): ApiClient =>
  createFixtureApiClient({
    profile,
    games,
    progress: { 2066020: played },
    rarity: {
      2066020: [
        { apiName: "BOSS_1", rarity: 0.4 },
        { apiName: "BOSS_2", rarity: 61.2 },
      ],
    },
  });

/** The profile answers and the library does not — two failures, one screen. */
const libraryRefused = (): ApiClient => ({
  ...library(),
  getGames: () => Promise.resolve(err("PRIVATE_PROFILE")),
});

/** Never answers, so the screen stays where it starts. */
const silent = (): ApiClient => {
  const never = () => new Promise<never>(() => {});
  return {
    getProfile: never,
    getGames: never,
    getGameProgress: never,
    getGameTally: never,
    getGameRarity: never,
    getAchievementNames: never,
  };
};

/**
 * Not one helper with a default: passing `undefined` to a defaulted parameter
 * restores the default, so "no profile remembered" would have quietly rendered
 * a device that remembers one.
 */
/** Changes the profile from inside the provider, as the setup screen does. */
const ProfileSwitch = () => {
  const { remember } = useSteamId();
  return (
    <Text
      accessibilityRole="button"
      accessibilityLabel="switch profile"
      onPress={() => void remember(OTHER_STEAM_ID)}
    >
      switch
    </Text>
  );
};

const renderAt = (
  clients: Readonly<Record<string, ApiClient>>,
  stored: string | undefined,
) => {
  mockClients = clients;
  return renderRouter(
    { index: LibraryScreen, setup: Stub, "game/[appId]": Stub },
    {
      initialUrl: "/",
      wrapper: ({ children }) => (
        <SteamIdProvider storage={storage(stored)}>
          {children}
          <ProfileSwitch />
        </SteamIdProvider>
      ),
    },
  );
};

const renderLibrary = (client: ApiClient) => renderAt({ [STEAM_ID]: client }, STEAM_ID);
const renderWithoutProfile = () => renderAt({}, undefined);

describe("library screen", () => {
  /**
   * Nothing here is about motion, and an animation left running is what makes
   * a screen test report an unmounted node rather than what it came to check.
   */
  beforeEach(deviceAsksForLessMotion);

  /**
   * Lets the loads still in flight finish before the screen is torn down. A
   * waitFor returns the moment its own assertion holds, and the waves behind it
   * would otherwise land on an unmounted screen and be reported as an update
   * outside act(). Registered here rather than globally so it runs before the
   * testing library's own cleanup.
   */
  afterEach(async () => {
    await act(async () => {});
  });

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
  it("sends a device that remembers no profile to setup", async () => {
    renderWithoutProfile();

    await waitFor(() => expect(screen.getByText("elsewhere")).toBeTruthy());
  });

  it("shows no library while it is still asking for one", async () => {
    renderLibrary(silent());

    await waitFor(() => expect(screen.queryByText("cariboucolas")).toBeNull());
    expect(screen.queryByTestId(UNLOCK_CALENDAR_CARD_TEST_ID)).toBeNull();
  });

  it("shows the profile and the games it owns", async () => {
    renderLibrary(library());

    await waitFor(() => expect(screen.getByText("cariboucolas")).toBeTruthy());
    expect(screen.getByText("1 games")).toBeTruthy();
    expect(screen.getByText("Soulstone Survivors")).toBeTruthy();
  });

  it("opens the game the reader presses", async () => {
    renderLibrary(library());

    fireEvent.press(await screen.findByText("Soulstone Survivors"));

    await waitFor(() => expect(screen).toHavePathname("/game/2066020"));
  });

  describe("when the backend refuses", () => {
    /**
     * The message covers two kinds of failure and this screen renders no
     * header, so both ways out have to be there. Without them the only
     * recovery is killing the app.
     */
    it("says what went wrong and offers both ways out", async () => {
      renderLibrary(refusing("UNAVAILABLE"));

      await waitFor(() =>
        expect(
          screen.getByText(
            "Could not reach the backend. Check that it is running, then try again.",
          ),
        ).toBeTruthy(),
      );
      expect(screen.getByLabelText("Try again")).toBeTruthy();
      expect(screen.getByLabelText("Change profile")).toBeTruthy();
    });

    it("distinguishes a private profile from a backend that is down", async () => {
      renderLibrary(refusing("PRIVATE_PROFILE"));

      await waitFor(() =>
        expect(
          screen.getByText(
            "This profile is private, so Steam will not say what has been unlocked.",
          ),
        ).toBeTruthy(),
      );
    });

    /**
     * The api client is memoised on the steam id, so asking the same profile
     * again is a no-op unless something else about the request changed. This
     * is what says the retry is a real one.
     */
    it("loads the library when the reader tries again", async () => {
      renderLibrary(downThenUp());

      fireEvent.press(await screen.findByLabelText("Try again"));

      await waitFor(() => expect(screen.getByText("cariboucolas")).toBeTruthy());
    });

    it("goes to setup when the reader would rather change profile", async () => {
      renderLibrary(refusing("NOT_FOUND"));

      fireEvent.press(await screen.findByLabelText("Change profile"));

      await waitFor(() => expect(screen).toHavePathname("/setup"));
    });
  });

  /**
   * A different profile must not show the previous one's library while it
   * loads. The second profile here never answers, so anything left on screen
   * is a leak rather than a race — the frozen order and the tone scale the
   * first library built included.
   */
  it("drops the library it was showing the moment the profile changes", async () => {
    renderAt({ [STEAM_ID]: library(), [OTHER_STEAM_ID]: silent() }, STEAM_ID);
    await screen.findByText("Soulstone Survivors");

    fireEvent.press(screen.getByLabelText("switch profile"));

    await waitFor(() =>
      expect(screen.queryByText("Soulstone Survivors")).toBeNull(),
    );
    expect(screen.queryByTestId(UNLOCK_CALENDAR_CARD_TEST_ID)).toBeNull();
  });

  /**
   * Choosing an order is a request to see things move, so the list re-sorts at
   * once rather than waiting for the waves still arriving.
   */
  it("re-sorts the library when the reader asks for another order", async () => {
    renderLibrary(shelved());
    await screen.findByText("Soulstone Survivors");

    fireEvent.press(screen.getByText("Most played"));

    await waitFor(() =>
      expect(drawnNames()).toEqual(["Soulstone Survivors", "Team Fortress 2"]),
    );

    fireEvent.press(screen.getByText("Recently played"));

    await waitFor(() =>
      expect(drawnNames()).toEqual(["Team Fortress 2", "Soulstone Survivors"]),
    );
  });

  it("reports a library that will not load even when the profile did", async () => {
    renderLibrary(libraryRefused());

    await waitFor(() =>
      expect(
        screen.getByText(
          "This profile is private, so Steam will not say what has been unlocked.",
        ),
      ).toBeTruthy(),
    );
  });

  it("goes to setup when the reader changes profile from the header", async () => {
    renderLibrary(library());

    fireEvent.press(await screen.findByLabelText("Change profile"));

    await waitFor(() => expect(screen).toHavePathname("/setup"));
  });

  /**
   * The ranking costs a load nobody has asked for until the tab is opened, and
   * a player who has unlocked nothing is told that rather than shown an empty
   * list.
   */
  it("ranks nothing, and says so, when the Rarest tab is opened", async () => {
    renderLibrary(library());
    await screen.findByText("Soulstone Survivors");

    fireEvent.press(screen.getByText("Rarest"));

    await waitFor(() =>
      expect(screen.getByText("Nothing unlocked in any game yet")).toBeTruthy(),
    );
  });

  it("ranks the rarest unlock first when Steam publishes figures", async () => {
    renderLibrary(ranked());
    await screen.findByText("Soulstone Survivors");

    fireEvent.press(screen.getByText("Rarest"));

    await waitFor(() => expect(screen.getByText("BOSS_1")).toBeTruthy());
    expect(
      screen.getAllByText(/BOSS_/).map((node) => String(node.children[0])),
    ).toEqual(["BOSS_1", "BOSS_2"]);
  });
});
