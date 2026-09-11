import type {
  AchievementDto,
  GameDto,
  GameProgressDto,
  ProfileDto,
} from "@steam/contracts";
import { err } from "@steam/domain";
import { Link } from "expo-router";
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
import type { SteamIdStorage } from "../settings/steam-id-storage";
import { SteamIdProvider } from "../settings/steam-id-store";
import GameScreen from "../../app/game/[appId]";

const STEAM_ID = "76561197979269357";

const SOULSTONE = 2066020;
const TEAM_FORTRESS = 440;
/** Owned by somebody, not by this player — ADR-0004 refuses it here or nowhere. */
const UNOWNED = 730;

let mockClients: Readonly<Record<string, ApiClient>> = {};

/**
 * The transport is replaced and nothing above it is, exactly as the library
 * screen's tests do it. useApiClient stays real: it is memoised on the steam
 * id, and that memoisation is the mechanism a profile switch runs through.
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
    appId: SOULSTONE,
    name: "Soulstone Survivors",
    playtimeMinutes: 4977,
    playtimeLabel: "83 h 57",
    iconUrl: "https://icon/2066020.jpg",
    lastPlayedAt: "2026-06-25T12:16:14.000Z",
  },
  {
    appId: TEAM_FORTRESS,
    name: "Team Fortress 2",
    playtimeMinutes: 405,
    playtimeLabel: "6 h 45",
    iconUrl: "https://icon/440.jpg",
    lastPlayedAt: null,
  },
];

const achievement = (
  apiName: string,
  displayName: string,
  unlockedAt: string | null,
): AchievementDto => ({
  apiName,
  displayName,
  description: `how you earn ${displayName}`,
  hidden: false,
  icon: "https://icon/a.jpg",
  iconGray: "https://icon/a_gray.jpg",
  unlocked: unlockedAt !== null,
  unlockedAt,
});

/** Two earned on two different days, two still to go. */
const played: GameProgressDto = {
  completion: { unlocked: 2, total: 4, percentage: 50 },
  achievements: [
    achievement("BOSS_1", "First Blood", "2026-06-01T10:00:00.000Z"),
    achievement("BOSS_2", "Second Wind", "2026-06-02T10:00:00.000Z"),
    achievement("BOSS_3", "Third Time Lucky", null),
    achievement("BOSS_4", "Fourth Wall", null),
  ],
  timeline: [
    { apiName: "BOSS_1", unlockedAt: "2026-06-01T10:00:00.000Z" },
    { apiName: "BOSS_2", unlockedAt: "2026-06-02T10:00:00.000Z" },
  ],
};

/** A game Steam defines no achievements for at all. */
const barren: GameProgressDto = {
  completion: { unlocked: 0, total: 0, percentage: 0 },
  achievements: [],
  timeline: [],
};

/** Nothing earned yet, which is not the same as nothing to earn. */
const untouched: GameProgressDto = {
  completion: { unlocked: 0, total: 4, percentage: 0 },
  achievements: played.achievements.map((one) => ({
    ...one,
    unlocked: false,
    unlockedAt: null,
  })),
  timeline: [],
};

const withProgress = (progress: Readonly<Record<number, GameProgressDto>>) =>
  createFixtureApiClient({ profile, games, progress });

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

/** The library answers and the game's progress does not. */
const progressRefused = (error: ApiError): ApiClient => ({
  ...withProgress({}),
  getGameProgress: () => Promise.resolve(err(error)),
});

/** Never answers, so the screen stays where it starts. */
const silent = (): ApiClient => {
  const never = () => new Promise<never>(() => {});
  return { ...withProgress({}), getGames: never };
};

const storage = (stored: string | undefined): SteamIdStorage => ({
  read: () => Promise.resolve(stored),
  write: () => Promise.resolve(),
  forget: () => Promise.resolve(),
});

const SetupStub = () => <Text>setup screen</Text>;

/**
 * Stands in for the library, and can send the reader to a game. Reaching the
 * game screen through it is what gives the back control something to go back
 * to: a route rendered directly is the only entry in the history.
 */
const LibraryStub = () => (
  <>
    <Text>library screen</Text>
    <Link href={`/game/${SOULSTONE}`}>open soulstone</Link>
  </>
);

/**
 * No default for `stored`: passing `undefined` to a defaulted parameter
 * restores the default, so "no profile remembered" would quietly render a
 * device that remembers one.
 */
const renderAt = (
  clients: Readonly<Record<string, ApiClient>>,
  initialUrl: string,
  stored: string | undefined,
) => {
  mockClients = clients;
  return renderRouter(
    { index: LibraryStub, setup: SetupStub, "game/[appId]": GameScreen },
    {
      initialUrl,
      wrapper: ({ children }) => (
        <SteamIdProvider storage={storage(stored)}>{children}</SteamIdProvider>
      ),
    },
  );
};

const renderGame = (client: ApiClient, appId: number | string = SOULSTONE) =>
  renderAt({ [STEAM_ID]: client }, `/game/${appId}`, STEAM_ID);

/** The achievement names the list is drawing, in the order it draws them. */
const drawnAchievements = (): readonly string[] =>
  screen
    .getAllByText(/^(First Blood|Second Wind|Third Time Lucky|Fourth Wall)$/)
    .map((node) => String(node.children[0]));

describe("game screen", () => {
  beforeEach(deviceAsksForLessMotion);

  /**
   * Lets the loads still in flight finish before the screen is torn down, so a
   * wave landing after a waitFor is not reported as an update outside act().
   * Registered here so it runs before the testing library's own cleanup.
   */
  afterEach(async () => {
    await act(async () => {});
  });

  it("sends a device that remembers no profile to setup", async () => {
    renderAt({}, `/game/${SOULSTONE}`, undefined);

    await waitFor(() => expect(screen.getByText("setup screen")).toBeTruthy());
  });

  it("shows no game while it is still asking for one", async () => {
    renderGame(silent());

    await waitFor(() =>
      expect(screen.queryByText("Soulstone Survivors")).toBeNull(),
    );
  });

  it("shows the game and what the player has earned in it", async () => {
    renderGame(withProgress({ [SOULSTONE]: played }));

    await waitFor(() =>
      expect(screen.getByText("Soulstone Survivors")).toBeTruthy(),
    );
    expect(screen.getByText("First Blood")).toBeTruthy();
    expect(screen.getByText("Fourth Wall")).toBeTruthy();
  });

  describe("the achievement filters", () => {
    it("counts each of the three on the chips", async () => {
      renderGame(withProgress({ [SOULSTONE]: played }));

      await waitFor(() => expect(screen.getByText("All 4")).toBeTruthy());
      expect(screen.getByText("Unlocked 2")).toBeTruthy();
      expect(screen.getByText("Locked 2")).toBeTruthy();
    });

    it("narrows the list to what is unlocked, and back", async () => {
      renderGame(withProgress({ [SOULSTONE]: played }));
      await screen.findByText("Unlocked 2");

      // Most recently earned first, and anything locked settles at the bottom.
      expect(drawnAchievements()).toEqual([
        "Second Wind",
        "First Blood",
        "Third Time Lucky",
        "Fourth Wall",
      ]);

      fireEvent.press(screen.getByText("Unlocked 2"));

      await waitFor(() =>
        expect(drawnAchievements()).toEqual(["Second Wind", "First Blood"]),
      );

      fireEvent.press(screen.getByText("Locked 2"));

      await waitFor(() =>
        expect(drawnAchievements()).toEqual([
          "Third Time Lucky",
          "Fourth Wall",
        ]),
      );

      fireEvent.press(screen.getByText("All 4"));

      await waitFor(() => expect(drawnAchievements()).toHaveLength(4));
    });
  });

  describe("the timeline", () => {
    it("lists the days the player earned something", async () => {
      renderGame(withProgress({ [SOULSTONE]: played }));
      await screen.findByText("Soulstone Survivors");

      fireEvent.press(screen.getByText("Timeline"));

      await waitFor(() => expect(screen.getByText("Second Wind")).toBeTruthy());
      expect(screen.getByText("First Blood")).toBeTruthy();
    });

    /**
     * A game with achievements and no unlocks has an empty timeline, which is
     * a statement about the player rather than a missing load.
     */
    it("says nothing is unlocked yet rather than drawing an empty list", async () => {
      renderGame(withProgress({ [SOULSTONE]: untouched }));
      await screen.findByText("Soulstone Survivors");

      fireEvent.press(screen.getByText("Timeline"));

      await waitFor(() =>
        expect(screen.getByText("Nothing unlocked yet")).toBeTruthy(),
      );
    });
  });

  describe("when there is nothing to show in the list", () => {
    /**
     * Never fetched is not the same as none to fetch, and the screen says
     * which: one of them is a load that has not happened, the other is the
     * whole truth about the game.
     */
    it("distinguishes achievements never loaded from a game that defines none", async () => {
      renderGame(withProgress({}));

      await waitFor(() =>
        expect(
          screen.getByText("Achievements not loaded for this game"),
        ).toBeTruthy(),
      );
      expect(
        screen.getByText("the schema and your unlocks load on first open"),
      ).toBeTruthy();
    });

    it("says a game defines no achievements when it defines none", async () => {
      renderGame(withProgress({ [SOULSTONE]: barren }));

      await waitFor(() =>
        expect(screen.getByText("This game has no achievements")).toBeTruthy(),
      );
      expect(screen.queryByText("All 0")).toBeNull();
    });
  });

  describe("when it cannot show the game", () => {
    /** ADR-0004: the backend answers for any appId, so this is refused here. */
    it("refuses a game outside the library", async () => {
      renderGame(withProgress({}), UNOWNED);

      await waitFor(() =>
        expect(screen.getByText("This game is not in the library.")).toBeTruthy(),
      );
    });

    it("refuses a route param that is not a game id", async () => {
      renderGame(withProgress({}), "not-a-number");

      await waitFor(() =>
        expect(screen.getByText("That is not a game id.")).toBeTruthy(),
      );
    });

    it("reports a library it could not read", async () => {
      renderGame(refusing("UNAVAILABLE"));

      await waitFor(() =>
        expect(
          screen.getByText(
            "Could not reach the backend. Check that it is running, then try again.",
          ),
        ).toBeTruthy(),
      );
    });

    it("reports progress it could not read, where the library was fine", async () => {
      renderGame(progressRefused("PRIVATE_PROFILE"));

      await waitFor(() =>
        expect(
          screen.getByText(
            "This profile is private, so Steam will not say what has been unlocked.",
          ),
        ).toBeTruthy(),
      );
    });

    /**
     * A deep link straight here can be the only history entry, so there is no
     * back path at all. Both ways out have to be offered on this screen.
     */
    it("offers both ways out", async () => {
      renderGame(refusing("UNAVAILABLE"));

      await screen.findByLabelText("Try again");
      expect(screen.getByLabelText("Change profile")).toBeTruthy();
    });

    it("goes to setup when the reader would rather change profile", async () => {
      renderGame(refusing("NOT_FOUND"));

      fireEvent.press(await screen.findByLabelText("Change profile"));

      await waitFor(() => expect(screen.getByText("setup screen")).toBeTruthy());
    });

    it("loads the game when the reader tries again", async () => {
      const up = withProgress({ [SOULSTONE]: played });
      let asked = 0;
      renderGame({
        ...up,
        getGames: () => {
          asked += 1;
          return asked === 1
            ? Promise.resolve(err("UNAVAILABLE"))
            : up.getGames();
        },
      });

      fireEvent.press(await screen.findByLabelText("Try again"));

      await waitFor(() =>
        expect(screen.getByText("Soulstone Survivors")).toBeTruthy(),
      );
    });
  });

  it("goes back to where the reader came from", async () => {
    renderAt({ [STEAM_ID]: withProgress({ [SOULSTONE]: played }) }, "/", STEAM_ID);

    fireEvent.press(await screen.findByText("open soulstone"));
    await screen.findByText("Soulstone Survivors");

    fireEvent.press(screen.getByLabelText("Back to library"));

    await waitFor(() => expect(screen.getByText("library screen")).toBeTruthy());
  });
});
