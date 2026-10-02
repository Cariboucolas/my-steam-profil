import type { GameDto, GameProgressDto, GameTallyDto, ProfileDto } from "@steam/contracts";
import { err, ok, type Result } from "@steam/domain";
import { useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { FreshQueries } from "../query/FreshQueries";
import { queries } from "../query/queries";
import type { ApiClient, ProgressError } from "./api-client";
import { createFixtureApiClient, createPendingApiClient } from "./fixture-api-client";
import { type GameLoad, useGameLoad } from "./use-game-load";

const STEAM_ID = "76561197979269357";
const OTHER_STEAM_ID = "76561197960287930";
const SOULSTONE = 2066020;
/** Owned by somebody, not by this player (ADR-0004). */
const UNOWNED = 730;

const PROFILE: ProfileDto = {
  steamId: STEAM_ID,
  personaName: "cariboucolas",
  avatarUrl: "https://avatars/full.jpg",
  profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}/`,
};

const GAME: GameDto = {
  appId: SOULSTONE,
  name: "Soulstone Survivors",
  playtimeMinutes: 4977,
  iconUrl: "https://icon/2066020.jpg",
  lastPlayedAt: "2026-06-25T12:16:14.000Z",
};

const PROGRESS: GameProgressDto = {
  completion: { unlocked: 0, total: 0, percentage: 0 },
  achievements: [],
  timeline: [],
};

const TALLY: GameTallyDto = { completion: PROGRESS.completion, unlocks: [] };

type Progress = Result<GameProgressDto, ProgressError>;

/** A library of one game, whose progress is whatever `answer` says, and counted. */
const libraryAnswering = (
  answer: () => Promise<Progress> = () => Promise.resolve(ok(PROGRESS)),
) => {
  const library = createFixtureApiClient({ profile: PROFILE, games: [GAME], progress: {} });
  const getGames = jest.fn(library.getGames);
  const getGameProgress = jest.fn((_appId: number, _signal?: AbortSignal) => answer());
  const client: ApiClient = { ...library, getGames, getGameProgress };
  return { client, getGames, getGameProgress };
};

const renderLoad = (client: ApiClient | undefined, appId: number = SOULSTONE) =>
  renderHook(() => ({ load: useGameLoad(STEAM_ID, client, appId), cache: useQueryClient() }), {
    wrapper: FreshQueries,
  });

type Ready = Extract<GameLoad, { status: "ready" }>;
type Failed = Extract<GameLoad, { status: "error" }>;

const readyOf = (load: GameLoad): Ready => {
  if (load.status !== "ready") {
    throw new Error(`expected a loaded game, got "${load.status}"`);
  }
  return load;
};

const failureOf = (load: GameLoad): Failed => {
  if (load.status !== "error") {
    throw new Error(`expected a failed load, got "${load.status}"`);
  }
  return load;
};

const TALLY_KEY = queries.tally(STEAM_ID, SOULSTONE).queryKey;

describe("useGameLoad", () => {
  it("is loading while no Profile is chosen", () => {
    const { result } = renderLoad(undefined);

    expect(result.current.load.status).toBe("loading");
  });

  it("is loading until the Games and the GameProgress have answered", () => {
    const { result } = renderLoad(createPendingApiClient());

    expect(result.current.load.status).toBe("loading");
  });

  it("hands over the Game and its GameProgress", async () => {
    const { client, getGameProgress } = libraryAnswering();
    const { result } = renderLoad(client);

    await waitFor(() => expect(result.current.load.status).toBe("ready"));
    expect(readyOf(result.current.load)).toEqual({
      status: "ready",
      game: GAME,
      progress: PROGRESS,
    });
    expect(getGameProgress).toHaveBeenCalledWith(SOULSTONE, expect.any(AbortSignal));
  });

  /** Not a failure: the achievements were simply never fetched for it. */
  it("hands over the Game alone when its achievements were never fetched", async () => {
    const { client } = libraryAnswering(() => Promise.resolve(err("NOT_LOADED")));
    const { result } = renderLoad(client);

    await waitFor(() => expect(result.current.load.status).toBe("ready"));
    expect(readyOf(result.current.load).progress).toBeNull();
  });

  describe("when it cannot show the game", () => {
    /** ADR-0004: the backend answers for any appId, so it is refused here or nowhere. */
    it("refuses a game outside the library without asking for its progress", async () => {
      const { client, getGameProgress } = libraryAnswering();
      const { result } = renderLoad(client, UNOWNED);

      await waitFor(() => expect(result.current.load.status).toBe("error"));
      expect(failureOf(result.current.load).error).toBe("NOT_IN_LIBRARY");
      expect(getGameProgress).not.toHaveBeenCalled();
    });

    it("refuses what is not a game id without asking anything, retried or not", async () => {
      const { client, getGames, getGameProgress } = libraryAnswering();
      const { result } = renderLoad(client, Number.NaN);

      expect(failureOf(result.current.load).error).toBe("INVALID_GAME_ID");
      await act(async () => failureOf(result.current.load).retry());
      expect(getGames).not.toHaveBeenCalled();
      expect(getGameProgress).not.toHaveBeenCalled();
    });

    it("says why the library could not be read", async () => {
      const { client, getGameProgress } = libraryAnswering();
      const { result } = renderLoad({
        ...client,
        getGames: () => Promise.resolve(err("NOT_FOUND")),
      });

      await waitFor(() => expect(result.current.load.status).toBe("error"));
      expect(failureOf(result.current.load).error).toBe("NOT_FOUND");
      expect(getGameProgress).not.toHaveBeenCalled();
    });

    it("says why the progress could not be read, where the library was fine", async () => {
      const { client } = libraryAnswering(() => Promise.resolve(err("PRIVATE_PROFILE")));
      const { result } = renderLoad(client);

      await waitFor(() => expect(result.current.load.status).toBe("error"));
      expect(failureOf(result.current.load).error).toBe("PRIVATE_PROFILE");
    });

    it("asks again for what failed, and only for that, when retried", async () => {
      let up = false;
      const { client, getGames, getGameProgress } = libraryAnswering(() =>
        Promise.resolve(up ? ok(PROGRESS) : err("NOT_FOUND")),
      );
      const { result } = renderLoad(client);
      await waitFor(() => expect(result.current.load.status).toBe("error"));

      up = true;
      act(() => failureOf(result.current.load).retry());

      await waitFor(() => expect(result.current.load.status).toBe("ready"));
      expect(getGameProgress).toHaveBeenCalledTimes(2);
      expect(getGames).toHaveBeenCalledTimes(1);
    });

    /** The game may have been bought since: the library is what is asked again. */
    it("asks for the library again when a game outside it is retried", async () => {
      const { client, getGames } = libraryAnswering();
      const { result } = renderLoad(client, UNOWNED);
      await waitFor(() => expect(result.current.load.status).toBe("error"));

      act(() => failureOf(result.current.load).retry());

      await waitFor(() => expect(getGames).toHaveBeenCalledTimes(2));
    });
  });

  /** The one retry the cache makes by itself (#162), for the progress as for the library. */
  it("asks once more, unprompted, for a progress the backend could not be reached for", async () => {
    let asked = 0;
    const { client, getGameProgress } = libraryAnswering(() => {
      asked += 1;
      return Promise.resolve(asked === 1 ? err("UNAVAILABLE") : ok(PROGRESS));
    });
    const { result } = renderLoad(client);

    await waitFor(() => expect(result.current.load.status).toBe("ready"));
    expect(getGameProgress).toHaveBeenCalledTimes(2);
  });

  /** The keys carry the SteamId (#162): another Profile starts from nothing. */
  it("shows nothing of the previous Profile once another is chosen", async () => {
    type Asked = { readonly steamId: string; readonly client: ApiClient };
    const { result, rerender } = renderHook(
      ({ steamId, client }: Asked) => useGameLoad(steamId, client, SOULSTONE),
      {
        initialProps: { steamId: STEAM_ID, client: libraryAnswering().client },
        wrapper: FreshQueries,
      },
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ steamId: OTHER_STEAM_ID, client: createPendingApiClient() });

    expect(result.current.status).toBe("loading");
  });

  /** A query nobody watches gives its place up (#162). */
  it("abandons the progress it was asking for once the page is left", async () => {
    const { client, getGameProgress } = libraryAnswering(() => new Promise(() => undefined));
    const { unmount } = renderLoad(client);
    await waitFor(() => expect(getGameProgress).toHaveBeenCalled());

    unmount();

    expect(getGameProgress.mock.calls[0]?.[1]?.aborted).toBe(true);
  });

  /**
   * The game view is not cached (ADR-0005): an answer the cache still holds
   * is never what the screen shows while a newer one is on its way.
   */
  it("is loading, and shows no earlier answer, while it asks for the progress again", async () => {
    let answer: () => Promise<Progress> = () => Promise.resolve(ok(PROGRESS));
    const { client } = libraryAnswering(() => answer());
    const { result } = renderLoad(client);
    await waitFor(() => expect(result.current.load.status).toBe("ready"));

    answer = () => new Promise(() => undefined);
    act(() => {
      void result.current.cache.invalidateQueries({
        queryKey: queries.progress(STEAM_ID, SOULSTONE).queryKey,
      });
    });

    await waitFor(() => expect(result.current.load.status).toBe("loading"));
  });

  describe("the tally the library holds for that Game", () => {
    /**
     * The library would otherwise keep, for five minutes, a count the game
     * view has just shown to be out of date (#162).
     */
    it("is marked out of date once a GameProgress lands", async () => {
      let land: (progress: Progress) => void = () => undefined;
      const { client } = libraryAnswering(() => new Promise((resolve) => (land = resolve)));
      const { result } = renderLoad(client);
      result.current.cache.setQueryData(TALLY_KEY, TALLY);
      await waitFor(() => expect(client.getGameProgress).toHaveBeenCalled());
      expect(result.current.cache.getQueryState(TALLY_KEY)?.isInvalidated).toBe(false);

      await act(async () => land(ok(PROGRESS)));

      await waitFor(() => expect(result.current.load.status).toBe("ready"));
      expect(result.current.cache.getQueryState(TALLY_KEY)?.isInvalidated).toBe(true);
    });

    it("is left alone when no GameProgress came back", async () => {
      const { client } = libraryAnswering(() => Promise.resolve(err("NOT_LOADED")));
      const { result } = renderLoad(client);
      result.current.cache.setQueryData(TALLY_KEY, TALLY);

      await waitFor(() => expect(result.current.load.status).toBe("ready"));
      expect(result.current.cache.getQueryState(TALLY_KEY)?.isInvalidated).toBe(false);
    });
  });
});
