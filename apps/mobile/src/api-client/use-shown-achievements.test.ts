import type { GameAchievementsDto } from "@steam/contracts";
import { err, ok, type Result } from "@steam/domain";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { ApiClient, ApiError } from "./api-client";
import { useShownAchievements, type ShownGames } from "./use-shown-achievements";

type Named = Result<GameAchievementsDto, ApiError>;

const SOULSTONE = 2066020;
const HALLS = 2218750;
const EXILE = 2694490;

const naming = (appId: number): GameAchievementsDto => [
  {
    apiName: `ACH_${appId}`,
    displayName: `Achievement of ${appId}`,
    icon: `https://icon/${appId}.jpg`,
  },
];

/** Only getGameAchievements is exercised; anything else is a bug in the hook. */
const refuse = () => {
  throw new Error("naming the rows should not have called this");
};

const clientAsking = (answer: (appId: number) => Promise<Named>): ApiClient => ({
  getProfile: refuse,
  getGames: refuse,
  getGameProgress: refuse,
  getGameTally: refuse,
  getGameRarity: refuse,
  getGameAchievements: answer,
});

/** Answers every game at once, and records what it was asked about. */
const eagerClient = () => {
  const asked: number[] = [];
  const client = clientAsking((appId) => {
    asked.push(appId);
    return Promise.resolve(ok(naming(appId)));
  });
  return { client, asked };
};

/**
 * Answers every game except the ones named, which stay in flight until the test
 * releases them — the only way to look at a load while it is still on.
 */
const heldClient = (
  hold: readonly number[],
  answer: (appId: number) => Named = (appId) => ok(naming(appId)),
) => {
  const gates: Array<() => void> = [];
  const asked: number[] = [];
  const client = clientAsking((appId) => {
    asked.push(appId);
    if (!hold.includes(appId)) {
      return Promise.resolve(answer(appId));
    }
    return new Promise<Named>((resolve) => {
      gates.push(() => resolve(answer(appId)));
    });
  });
  const release = async () => {
    await act(async () => {
      for (const open of gates.splice(0)) open();
    });
  };
  return { client, asked, release };
};

const shown = (client: ApiClient, appIds: readonly number[]): ShownGames => ({
  client,
  appIds,
});

const renderNames = (initial: ShownGames | null) =>
  renderHook(({ games }: { games: ShownGames | null }) => useShownAchievements(games), {
    initialProps: { games: initial },
  });

describe("useShownAchievements", () => {
  /**
   * Which games are worth the schema is a property of the ranking, not of the
   * library: until there are rows, there is nothing to name and nothing to ask.
   */
  it("asks nothing while there is no ranking to name", async () => {
    const { client, asked } = eagerClient();
    const { result, rerender } = renderNames(null);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(asked).toEqual([]);
    expect(result.current.names).toEqual({});

    // And it starts the moment there is one, without being armed by anything.
    rerender({ games: shown(client, [SOULSTONE]) });

    await waitFor(() => expect(asked).toEqual([SOULSTONE]));
  });

  it("asks each game the shown rows come from, once", async () => {
    const { client, asked } = eagerClient();
    const { result } = renderNames(shown(client, [SOULSTONE, HALLS]));

    await waitFor(() =>
      expect(result.current.names).toEqual({
        [SOULSTONE]: naming(SOULSTONE),
        [HALLS]: naming(HALLS),
      }),
    );

    expect(asked).toEqual([SOULSTONE, HALLS]);
  });

  /**
   * Three to six calls, and never the same one twice. A ranking is rebuilt on
   * every render it is drawn in, so a hook that asked again on each of them
   * would put the payload ADR-0005 removed back on the wire repeatedly.
   */
  it("does not ask again for a game it has already been told about", async () => {
    const { client, asked } = eagerClient();
    const { result, rerender } = renderNames(shown(client, [SOULSTONE]));

    await waitFor(() => expect(asked).toEqual([SOULSTONE]));
    rerender({ games: shown(client, [SOULSTONE]) });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(asked).toEqual([SOULSTONE]);
  });

  /** A wave of rarity landing can push a new game into the ranking. */
  it("asks only about the games a changed ranking added", async () => {
    const { client, asked } = eagerClient();
    const { result, rerender } = renderNames(shown(client, [SOULSTONE]));

    await waitFor(() => expect(asked).toEqual([SOULSTONE]));
    rerender({ games: shown(client, [SOULSTONE, HALLS]) });

    await waitFor(() => expect(asked).toEqual([SOULSTONE, HALLS]));
    expect(result.current.names[SOULSTONE]).toEqual(naming(SOULSTONE));
  });

  /**
   * One game failing leaves its rows under the apiName they were ranked with.
   * It must not cost the rows of the games that answered their names.
   */
  it("keeps what landed when one game cannot be named", async () => {
    const { client } = heldClient([], (appId) =>
      appId === HALLS ? err<ApiError>("UNAVAILABLE") : ok(naming(appId)),
    );
    const { result } = renderNames(shown(client, [SOULSTONE, HALLS]));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.names).toEqual({ [SOULSTONE]: naming(SOULSTONE) });
  });

  /**
   * Names belong to the library they were fetched for. Another player's rows
   * are other achievements, and answering them from these would name a row
   * after something the reader never unlocked.
   */
  it("throws away what it learned when the player changes", async () => {
    const { client } = eagerClient();
    const { result, rerender } = renderNames(shown(client, [SOULSTONE]));

    await waitFor(() => expect(result.current.names[SOULSTONE]).toBeDefined());

    const other = eagerClient();
    rerender({ games: shown(other.client, [EXILE]) });

    await waitFor(() =>
      expect(result.current.names).toEqual({ [EXILE]: naming(EXILE) }),
    );
  });

  /**
   * The load the tab draws its bar from: on while an answer is outstanding.
   *
   * A ranking's three to six games fit in one wave of six, so they land
   * together — one slow game holds the names of the others, and the rows show
   * the apiNames they were ranked under until it answers.
   */
  it("says it is loading until every game asked about has answered", async () => {
    const { client, release } = heldClient([HALLS]);
    const { result } = renderNames(shown(client, [SOULSTONE, HALLS]));

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.names).toEqual({});

    await release();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.names).toEqual({
      [SOULSTONE]: naming(SOULSTONE),
      [HALLS]: naming(HALLS),
    });
  });

  it("is not loading once there is nothing left to ask about", async () => {
    const { client } = eagerClient();
    const { result } = renderNames(shown(client, [SOULSTONE]));

    await waitFor(() => expect(result.current.names[SOULSTONE]).toBeDefined());

    expect(result.current.loading).toBe(false);
  });

  /** An answer landing after the screen is gone is a state update on nothing. */
  it("drops an answer that lands after the reader has left", async () => {
    const { client, release } = heldClient([SOULSTONE]);
    const { unmount } = renderNames(shown(client, [SOULSTONE]));

    unmount();

    await expect(release()).resolves.toBeUndefined();
  });
});
