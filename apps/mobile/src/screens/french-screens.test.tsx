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
import type { ApiClient } from "../api-client/api-client";
import { createFixtureApiClient } from "../api-client/fixture-api-client";
import type { Locale } from "../i18n/locale";
import type { LocaleStorage } from "../settings/locale-storage";
import { LocaleProvider } from "../settings/locale-store";
import type { SteamIdStorage } from "../settings/steam-id-storage";
import { SteamIdProvider } from "../settings/steam-id-store";
import GameScreen from "../../app/game/[appId]";
import LibraryScreen from "../../app/index";

const STEAM_ID = "76561197979269357";
const SOULSTONE = 2066020;
const UNOWNED = 730;

let mockClient: ApiClient;

jest.mock("../api-client", () => ({
  createApiClient: () => mockClient,
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
    iconUrl: "https://icon/2066020.jpg",
    lastPlayedAt: "2026-06-25T12:16:14.000Z",
  },
];

const achievement = (apiName: string, unlockedAt: string | null): AchievementDto => ({
  apiName,
  displayName: apiName,
  description: unlockedAt === null ? "" : "how you earn it",
  hidden: false,
  icon: "https://icon/a.jpg",
  iconGray: "https://icon/a_gray.jpg",
  unlocked: unlockedAt !== null,
  unlockedAt,
});

const played: GameProgressDto = {
  completion: { unlocked: 1, total: 2, percentage: 50 },
  achievements: [achievement("BOSS_1", "2026-06-01T10:00:00.000Z"), achievement("BOSS_2", null)],
  timeline: [{ apiName: "BOSS_1", unlockedAt: "2026-06-01T10:00:00.000Z" }],
};

const client = (): ApiClient =>
  createFixtureApiClient({ profile, games, progress: { [SOULSTONE]: played } });

const steamIdStorage: SteamIdStorage = {
  read: () => Promise.resolve(STEAM_ID),
  write: () => Promise.resolve(),
  forget: () => Promise.resolve(),
};

const localeStorage = (stored: Locale) => {
  const writes: Locale[] = [];
  const storage: LocaleStorage = {
    read: () => Promise.resolve(stored),
    write: (locale) => {
      writes.push(locale);
      return Promise.resolve();
    },
  };
  return { storage, writes };
};

const LibraryStub = () => <Text>library screen</Text>;
const SetupStub = () => <Text>setup screen</Text>;

const renderAt = (url: string, stored: Locale) => {
  const locale = localeStorage(stored);
  renderRouter(
    { index: LibraryScreen, setup: SetupStub, "game/[appId]": GameScreen, library: LibraryStub },
    {
      initialUrl: url,
      wrapper: ({ children }) => (
        <LocaleProvider storage={locale.storage}>
          <SteamIdProvider storage={steamIdStorage}>{children}</SteamIdProvider>
        </LocaleProvider>
      ),
    },
  );
  return locale;
};

describe("the app in French", () => {
  beforeEach(() => {
    mockClient = client();
    deviceAsksForLessMotion();
  });

  afterEach(async () => {
    await act(async () => {});
  });

  it("writes the library screen in French, spoken labels included", async () => {
    renderAt("/", "fr");

    await screen.findByText("1 jeu");
    expect(screen.getByText("Complétion")).toBeTruthy();
    expect(screen.getByText("Plus rares")).toBeTruthy();
    expect(screen.getByText("Terminés d'abord")).toBeTruthy();
    expect(screen.getByText("Activité")).toBeTruthy();
    expect(screen.getByText(/^ANNÉE \d{4} · JAN → DÉC$/)).toBeTruthy();
    expect(screen.getByLabelText("Changer de profil")).toBeTruthy();
    expect(screen.getByText("· révision dev", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText("Soulstone Survivors")).toBeTruthy();
    expect(screen.queryByText("Activity")).toBeNull();
    expect(screen.queryByText("Completion")).toBeNull();
  });

  it("writes the game screen in French, dates and filters included", async () => {
    renderAt(`/game/${SOULSTONE}`, "fr");

    await screen.findByText("Tous 2");
    expect(screen.getByText("Débloqués 1")).toBeTruthy();
    expect(screen.getByText("Verrouillés 1")).toBeTruthy();
    expect(screen.getByText("Succès")).toBeTruthy();
    expect(screen.getByText("Chronologie")).toBeTruthy();
    expect(screen.getByText("1 juin 2026")).toBeTruthy();
    expect(screen.getByText("verrouillé")).toBeTruthy();
    expect(screen.getByText("Succès caché — aucune description")).toBeTruthy();
    expect(screen.getByText("1 succès restant")).toBeTruthy();
    expect(screen.getByLabelText("Retour à la bibliothèque")).toBeTruthy();
    expect(screen.getByText(/^82 h 57 de jeu · dernière partie le 25 juin 2026$/, {
      includeHiddenElements: true,
    })).toBeTruthy();
  });

  it("writes an error in French, and offers its way out in French", async () => {
    mockClient = { ...client(), getGames: () => Promise.resolve(err("PRIVATE_PROFILE")) };
    renderAt("/", "fr");

    await screen.findByText("Ce profil est privé : Steam ne dira pas ce qui a été débloqué.");
    expect(screen.getByLabelText("Réessayer")).toBeTruthy();
    expect(screen.getByLabelText("Changer de profil")).toBeTruthy();
  });

  it("refuses a game the player does not own in French", async () => {
    renderAt(`/game/${UNOWNED}`, "fr");

    await screen.findByText("Ce jeu n'est pas dans la bibliothèque.");
  });

  it("refuses an identifier that is no game in French", async () => {
    renderAt("/game/abc", "fr");

    await screen.findByText("Ce n'est pas un identifiant de jeu.");
  });
});

describe("switching the language", () => {
  beforeEach(() => {
    mockClient = client();
    deviceAsksForLessMotion();
  });

  afterEach(async () => {
    await act(async () => {});
  });

  it("re-renders the screen at once, and keeps the choice", async () => {
    const { writes } = renderAt("/", "en");

    await screen.findByText("Activity");
    fireEvent.press(screen.getByText("FR"));

    await waitFor(() => expect(screen.getByText("Activité")).toBeTruthy());
    expect(screen.queryByText("Activity")).toBeNull();
    expect(writes).toContain("fr");
  });

  it("re-renders the game screen too, texts a view-model wrote included", async () => {
    renderAt(`/game/${SOULSTONE}`, "en");

    await screen.findByText("All 2");
    fireEvent.press(screen.getByText("FR"));

    await waitFor(() => expect(screen.getByText("Tous 2")).toBeTruthy());
    expect(screen.getByText("1 juin 2026")).toBeTruthy();
    expect(screen.queryByText("All 2")).toBeNull();
    expect(screen.queryByText("1 Jun 2026")).toBeNull();
  });
});
