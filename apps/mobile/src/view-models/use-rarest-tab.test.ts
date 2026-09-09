import type {
  AchievementNamesDto,
  GameDto,
  GameRarityDto,
  GameTallyDto,
} from "@steam/contracts";
import { err, ok, type Result } from "@steam/domain";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { ApiClient, ApiError } from "../api-client/api-client";
import type { CountedLibrary } from "../api-client/use-library-rarity";
import type { LibraryView, TallyByAppId } from "./library";
import { useRarestTab } from "./use-rarest-tab";

/** Three games, so a ranking crosses games rather than ordering one. */
const GAMES: readonly GameDto[] = [1, 2, 3].map((appId) => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 60,
  playtimeLabel: "1 h",
  iconUrl: `https://example.test/${appId}.jpg`,
  lastPlayedAt: null,
}));

const tally = (unlocks: readonly string[]): GameTallyDto => ({
  completion: { unlocked: unlocks.length, total: 10, percentage: unlocks.length * 10 },
  unlocks: unlocks.map((apiName, index) => ({ apiName, at: 1_700_000 + index })),
});

const TALLIES: TallyByAppId = {
  1: tally(["ACH_1"]),
  2: tally(["ACH_2"]),
  3: tally([]),
};

/** Game 2 holds the rarer trophy, so the ranking must not follow appId order. */
const RARITY: Readonly<Record<number, GameRarityDto>> = {
  1: [{ apiName: "ACH_1", rarity: 12 }],
  2: [{ apiName: "ACH_2", rarity: 0.4 }],
};

const NAMES: Readonly<Record<number, AchievementNamesDto>> = {
  1: [{ apiName: "ACH_1", displayName: "Started", icon: "started.jpg" }],
  2: [{ apiName: "ACH_2", displayName: "Ascendant", icon: "ascend.jpg" }],
};

const view = (over: Partial<LibraryView> = {}): LibraryView => ({
  games: GAMES,
  tallies: TALLIES,
  sort: "completed",
  pending: new Set(),
  frozenOrder: null,
  ...over,
});

const refuse = () => {
  throw new Error("the rarest tab should not have called this");
};

type Asked = { readonly rarity: number[]; readonly names: number[] };

/**
 * A client answering both phases, recording what each was asked about, and
 * holding back the games named so a load can be looked at while it is still on.
 */
const client = (
  hold: { rarity?: readonly number[]; names?: readonly number[] } = {},
  published: Readonly<Record<number, GameRarityDto>> = RARITY,
) => {
  const asked: Asked = { rarity: [], names: [] };
  const gates: Array<() => void> = [];

  const answer = <T>(
    held: readonly number[],
    appId: number,
    value: Result<T, ApiError>,
  ): Promise<Result<T, ApiError>> =>
    held.includes(appId)
      ? new Promise((resolve) => gates.push(() => resolve(value)))
      : Promise.resolve(value);

  const api: ApiClient = {
    getProfile: refuse,
    getGames: refuse,
    getGameProgress: refuse,
    getGameTally: refuse,
    getGameRarity: (appId) => {
      asked.rarity.push(appId);
      const figures = published[appId];
      return answer(
        hold.rarity ?? [],
        appId,
        figures ? ok(figures) : err<ApiError>("UNAVAILABLE"),
      );
    },
    getAchievementNames: (appId) => {
      asked.names.push(appId);
      const named = NAMES[appId];
      return answer(
        hold.names ?? [],
        appId,
        named ? ok(named) : err<ApiError>("UNAVAILABLE"),
      );
    },
  };

  const release = async () => {
    await act(async () => {
      for (const open of gates.splice(0)) open();
    });
  };

  return { api, asked, release };
};

/** Answers every rarity and refuses every name. */
const renderNamelessClient = () => {
  const { api, asked, release } = client();
  return {
    api: { ...api, getAchievementNames: () => Promise.resolve(err<ApiError>("UNAVAILABLE")) },
    asked,
    release,
  };
};

type Props = {
  readonly library: CountedLibrary | null;
  readonly view: LibraryView;
  readonly active: boolean;
};

const renderTab = (
  library: CountedLibrary | null,
  active = true,
  shownView: LibraryView = view(),
) =>
  renderHook(
    ({ library: l, view: v, active: a }: Props) => useRarestTab(l, v, a),
    { initialProps: { library, view: shownView, active } },
  );

/**
 * More games holding an unlock than one wave carries, so a ranking exists and
 * is still wrong while the load runs — which is the state phase two must not
 * be started from.
 */
const OVER_ONE_WAVE = [11, 12, 13, 14, 15, 16, 17, 18] as const;

const overOneWave = () => {
  const tallies: TallyByAppId = Object.fromEntries(
    OVER_ONE_WAVE.map((appId) => [appId, tally([`ACH_${appId}`])]),
  );
  const games: readonly GameDto[] = OVER_ONE_WAVE.map((appId) => ({
    appId,
    name: `Game ${appId}`,
    playtimeMinutes: 60,
    playtimeLabel: "1 h",
    iconUrl: `https://example.test/${appId}.jpg`,
    lastPlayedAt: null,
  }));
  const published: Readonly<Record<number, GameRarityDto>> = Object.fromEntries(
    OVER_ONE_WAVE.map((appId, index) => [
      appId,
      [{ apiName: `ACH_${appId}`, rarity: index + 1 }],
    ]),
  );

  return { tallies, view: view({ games, tallies }), published };
};

describe("useRarestTab", () => {
  /** A secondary tab that nobody has opened costs nothing. */
  it("has nothing to say while the tab has not been opened", async () => {
    const { api, asked } = client();
    const { result } = renderTab({ client: api, tallies: TALLIES }, false);

    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(asked.rarity).toEqual([]);
    expect(result.current.rows).toEqual([]);
  });

  /**
   * Phase one is bounded by which games hold an unlock, which is what the
   * completion waves deliver — so an open tab waits on them and says so rather
   * than showing a list that is empty for a reason nobody could guess.
   */
  it("says it is waiting on the count before a counted library arrives", async () => {
    const { asked } = client();
    const { result } = renderTab(null);

    await waitFor(() => expect(result.current.status).toBe("counting"));

    expect(asked.rarity).toEqual([]);
    expect(result.current.rows).toEqual([]);
    expect(result.current.loaded).toBeNull();
  });

  it("ranks the rarest first and names each row from its own game", async () => {
    const { api } = client();
    const { result } = renderTab({ client: api, tallies: TALLIES });

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    await waitFor(() => expect(result.current.rows[0]?.displayName).toBe("Ascendant"));

    expect(result.current.rows.map((row) => row.rarityLabel)).toEqual(["0.4%", "12%"]);
    expect(result.current.rows[0]?.gameName).toBe("Game 2");
    expect(result.current.rows[0]?.icon).toBe("ascend.jpg");
  });

  /**
   * Phase two is the 253 KB payload ADR-0005 took out of the library's path. It
   * is affordable only because the ranking has already decided which three to
   * six games are worth it — never one per library game.
   */
  it("asks for a schema only from the games the shown rows come from", async () => {
    const { api, asked } = client();
    const { result } = renderTab({ client: api, tallies: TALLIES });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    await waitFor(() => expect(asked.names.length).toBeGreaterThan(0));

    expect([...new Set(asked.names)].sort()).toEqual([1, 2]);
    // Game 3 holds no unlock, so neither phase ever hears about it.
    expect(asked.rarity).not.toContain(3);
    expect(asked.names).not.toContain(3);
  });

  /**
   * The games worth a schema are the ones the *finished* ranking shows. A
   * ranking half-way through a load shows whatever the waves so far happened to
   * hold, and every game it passes through is asked for and remembered — so
   * starting phase two early spends 253 KB on games that then drop out, which
   * is the whole of the cost ADR-0005 took out of this screen.
   */
  it("asks for no schema until every figure is in", async () => {
    const { view: wide, tallies, published } = overOneWave();
    const held = client({ rarity: [18] }, published);
    const { result } = renderTab({ client: held.api, tallies }, true, wide);

    // The first wave has landed, so there is a ranking — and it is not the one.
    await waitFor(() => expect(result.current.rows).toHaveLength(6));
    expect(result.current.status).toBe("loading");
    expect(held.asked.names).toEqual([]);

    await held.release();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    await waitFor(() => expect(held.asked.names).toHaveLength(8));
    expect([...new Set(held.asked.names)]).toHaveLength(8);
  });

  /**
   * Phase one is the two hundred games the reader is made to wait on, and its
   * share is the whole of what the stats card's load bar draws.
   */
  it("reports phase one's share while the figures are still landing", async () => {
    const { view: wide, tallies, published } = overOneWave();
    const held = client({ rarity: [18] }, published);
    const { result } = renderTab({ client: held.api, tallies }, true, wide);

    await waitFor(() => expect(result.current.status).toBe("loading"));
    await waitFor(() => expect(result.current.loaded).toBeGreaterThan(0));
    expect(result.current.loaded).toBeLessThan(1);

    await held.release();
  });

  /**
   * Phase two reports nothing, for the reasons `RarestTab.loaded` gives: the
   * rows say which of them are waiting, and a share of one wave would be 0 for
   * the whole of it (#66).
   */
  it("reports no share while only the second phase is outstanding", async () => {
    const held = client({ names: [1, 2] });
    const { result } = renderTab({ client: held.api, tallies: TALLIES });

    // Phase one is over — its rows are ranked — and the wait is not.
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.rows.map((row) => row.pending)).toEqual([true, true]);
    expect(result.current.loaded).toBeNull();

    await held.release();

    await waitFor(() => expect(result.current.rows[0]?.displayName).toBe("Ascendant"));
    expect(result.current.loaded).toBeNull();
  });

  /**
   * A row earned its place on a figure Steam published and a day the player
   * unlocked it. A game that will not name it takes neither back.
   */
  it("keeps a row whose game could not name it", async () => {
    const { api } = renderNamelessClient();
    const { result } = renderTab({ client: api, tallies: TALLIES });

    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    expect(result.current.rows[0]?.displayName).toBe("ACH_2");
    expect(result.current.rows[0]?.icon).toBeNull();
  });

  /**
   * The ranking says what it was ranked across, because a library holds games
   * nobody publishes figures for and a bare list would read as the whole
   * library's answer.
   */
  it("says what the ranking was ranked across", async () => {
    const { api } = client();
    const { result } = renderTab({ client: api, tallies: TALLIES });

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.countedLabel).toBe("rarest 2 across 2 games counted");
  });

  it("has nothing to rank for a player who has unlocked nothing anywhere", async () => {
    const { api } = client();
    const { result } = renderTab({ client: api, tallies: {} });

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.rows).toEqual([]);
    expect(result.current.countedLabel).toBe("nothing to rank across 0 games counted");
    expect(result.current.loaded).toBeNull();
    expect(result.current.anyUnlock).toBe(false);
  });

  /**
   * An empty ranking means two different things, and only one of them is about
   * the player: a library with no unlock in it, and a library Steam publishes
   * no figure for. Telling the second player they have unlocked nothing is a
   * plain untruth, and they are the ones holding the trophies.
   */
  it("does not call a library Steam says nothing about an empty one", async () => {
    const { api } = client({}, {});
    const { result } = renderTab({ client: api, tallies: TALLIES });

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.rows).toEqual([]);
    expect(result.current.anyUnlock).toBe(true);
  });
});
