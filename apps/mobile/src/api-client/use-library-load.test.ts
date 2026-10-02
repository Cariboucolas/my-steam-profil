import type { GameDto, ProfileDto } from "@steam/contracts";
import { err, ok } from "@steam/domain";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { FreshQueries } from "../query/FreshQueries";
import { queries } from "../query/queries";
import type { ApiClient, ApiError } from "./api-client";
import { createFixtureApiClient, createPendingApiClient } from "./fixture-api-client";
import { type LibraryLoad, useLibraryLoad } from "./use-library-load";

const STEAM_ID = "76561197979269357";
const OTHER_STEAM_ID = "76561197960287930";

const profileOf = (steamId: string, personaName: string): ProfileDto => ({
  steamId,
  personaName,
  avatarUrl: "https://avatars/full.jpg",
  profileUrl: `https://steamcommunity.com/profiles/${steamId}/`,
});

const game = (appId: number): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 100,
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt: "2026-06-25T12:16:14.000Z",
});

const PROFILE = profileOf(STEAM_ID, "cariboucolas");
const OTHER_PROFILE = profileOf(OTHER_STEAM_ID, "somebody else");
const GAMES: readonly GameDto[] = [game(440), game(2066020)];
const OTHER_GAMES: readonly GameDto[] = [game(500)];

const library = (): ApiClient =>
  createFixtureApiClient({ profile: PROFILE, games: GAMES, progress: {} });

const otherLibrary = (): ApiClient =>
  createFixtureApiClient({ profile: OTHER_PROFILE, games: OTHER_GAMES, progress: {} });

type Asked = { readonly steamId: string | undefined; readonly client: ApiClient | undefined };

const mine = (client: ApiClient = library()): Asked => ({ steamId: STEAM_ID, client });

/** Every state the hook handed over, in order, so a test can read each render. */
const renderLoad = (asked: Asked) => {
  const renders: LibraryLoad[] = [];
  const rendered = renderHook(
    ({ steamId, client }: Asked) => {
      const load = useLibraryLoad(steamId, client);
      renders.push(load);
      return { load, cache: useQueryClient() };
    },
    { initialProps: asked, wrapper: FreshQueries },
  );
  return { ...rendered, renders };
};

type Ready = Extract<LibraryLoad, { status: "ready" }>;
type Failed = Extract<LibraryLoad, { status: "error" }>;

const readyOf = (load: LibraryLoad): Ready => {
  if (load.status !== "ready") {
    throw new Error(`expected a loaded library, got "${load.status}"`);
  }
  return load;
};

const failureOf = (load: LibraryLoad): Failed => {
  if (load.status !== "error") {
    throw new Error(`expected a failed load, got "${load.status}"`);
  }
  return load;
};

/** How many answers the cache has kept for my Games, the first one included. */
const timesAnswered = (cache: QueryClient) =>
  cache.getQueryState(queries.games(STEAM_ID).queryKey)?.dataUpdateCount;

describe("useLibraryLoad", () => {
  it("asks nothing while no Profile is chosen", () => {
    const { result } = renderLoad({ steamId: undefined, client: undefined });

    expect(result.current.load.status).toBe("loading");
  });

  it("is loading until both the Profile and the Games have answered", () => {
    const { result } = renderLoad(mine(createPendingApiClient()));

    expect(result.current.load.status).toBe("loading");
  });

  it("hands over the Profile and the Games it owns", async () => {
    const { result } = renderLoad(mine());

    await waitFor(() => expect(result.current.load.status).toBe("ready"));
    expect(readyOf(result.current.load)).toMatchObject({ profile: PROFILE, games: GAMES });
  });

  describe("the identity of the Games", () => {
    /**
     * The tallies are counted off this identity, and the calendar's tone scale
     * and the frozen order are held against it (#162): a new array for the same
     * library would count it again.
     */
    it("is the same across two renders", async () => {
      const asked = mine();
      const { result, rerender } = renderLoad(asked);
      await waitFor(() => expect(result.current.load.status).toBe("ready"));
      const before = readyOf(result.current.load).games;

      rerender(asked);

      expect(readyOf(result.current.load).games).toBe(before);
    });

    it("is the same after the backend answered again with what it said before", async () => {
      const getGames = jest.fn(() => Promise.resolve(ok(GAMES.map((each) => ({ ...each })))));
      const { result } = renderLoad(mine({ ...library(), getGames }));
      await waitFor(() => expect(result.current.load.status).toBe("ready"));
      const before = readyOf(result.current.load).games;

      await act(() => result.current.cache.invalidateQueries());

      expect(getGames).toHaveBeenCalledTimes(2);
      await waitFor(() => expect(timesAnswered(result.current.cache)).toBe(2));
      expect(readyOf(result.current.load).games).toBe(before);
    });
  });

  describe("when the Profile changes", () => {
    it("shows nothing of the previous Profile at any render", async () => {
      const { result, rerender, renders } = renderLoad(mine());
      await waitFor(() => expect(result.current.load.status).toBe("ready"));
      const rendersBefore = renders.length;

      rerender({ steamId: OTHER_STEAM_ID, client: otherLibrary() });
      await waitFor(() => expect(result.current.load.status).toBe("ready"));

      const since = renders.slice(rendersBefore);
      expect(since[0]).toEqual({ status: "loading" });
      for (const load of since.filter((each) => each.status === "ready")) {
        expect(load).toMatchObject({ profile: OTHER_PROFILE, games: OTHER_GAMES });
      }
    });

    /** What is queued for the previous Profile gives its place up (#162). */
    it("abandons what it had asked for the previous one", async () => {
      const signals: AbortSignal[] = [];
      const waiting = <Answer>(signal?: AbortSignal): Promise<Answer> => {
        if (signal !== undefined) signals.push(signal);
        return new Promise<Answer>(() => undefined);
      };
      const silent: ApiClient = { ...library(), getProfile: waiting, getGames: waiting };
      const { result, rerender } = renderLoad(mine(silent));
      expect(signals).toHaveLength(2);

      rerender({ steamId: OTHER_STEAM_ID, client: otherLibrary() });
      await waitFor(() => expect(result.current.load.status).toBe("ready"));

      expect(signals.map((signal) => signal.aborted)).toEqual([true, true]);
    });
  });

  describe("when the backend refuses", () => {
    const refusingGames = (error: ApiError): ApiClient => ({
      ...library(),
      getGames: () => Promise.resolve(err(error)),
    });

    it("says why the library will not load even when the Profile did", async () => {
      const { result } = renderLoad(mine(refusingGames("PRIVATE_PROFILE")));

      await waitFor(() => expect(result.current.load.status).toBe("error"));
      expect(failureOf(result.current.load).error).toBe("PRIVATE_PROFILE");
    });

    it("says the Profile's failure when both failed", async () => {
      const client: ApiClient = {
        ...refusingGames("PRIVATE_PROFILE"),
        getProfile: () => Promise.resolve(err("NOT_FOUND")),
      };
      const { result } = renderLoad(mine(client));

      await waitFor(() => expect(result.current.load.status).toBe("error"));
      expect(failureOf(result.current.load).error).toBe("NOT_FOUND");
    });

    /** The port never rejects (ADR-0002); a screen stuck on loading is no answer if it does. */
    it("says the library could not be reached when a question threw", async () => {
      const client: ApiClient = {
        ...library(),
        getGames: () => Promise.reject(new TypeError("undefined is not a function")),
      };
      const { result } = renderLoad(mine(client));

      await waitFor(() => expect(result.current.load.status).toBe("error"));
      expect(failureOf(result.current.load).error).toBe("UNAVAILABLE");
    });

    it("asks again for what failed, and only for that, when retried", async () => {
      let up = false;
      const answering = library();
      const getProfile = jest.fn(() =>
        up ? answering.getProfile() : Promise.resolve(err("NOT_FOUND" as const)),
      );
      const getGames = jest.fn(() => answering.getGames());
      const { result } = renderLoad(mine({ ...answering, getProfile, getGames }));
      await waitFor(() => expect(result.current.load.status).toBe("error"));

      up = true;
      act(() => failureOf(result.current.load).retry());

      await waitFor(() => expect(result.current.load.status).toBe("ready"));
      expect(getProfile).toHaveBeenCalledTimes(2);
      expect(getGames).toHaveBeenCalledTimes(1);
    });

    /**
     * A library that had loaded and then failed when asked again still holds
     * what it loaded, so the query stays failed while it asks: the wait has to
     * show, or pressing "try again" would look like it did nothing.
     */
    it("is loading while it asks again for a library it had once loaded", async () => {
      let answer: () => ReturnType<ApiClient["getGames"]> = () => Promise.resolve(ok(GAMES));
      const client: ApiClient = { ...library(), getGames: () => answer() };
      const { result } = renderLoad(mine(client));
      await waitFor(() => expect(result.current.load.status).toBe("ready"));

      answer = () => Promise.resolve(err("PRIVATE_PROFILE"));
      await act(() => result.current.cache.invalidateQueries());
      await waitFor(() => expect(result.current.load.status).toBe("error"));

      answer = () => new Promise(() => undefined);
      act(() => failureOf(result.current.load).retry());

      await waitFor(() => expect(result.current.load.status).toBe("loading"));
    });
  });
});
