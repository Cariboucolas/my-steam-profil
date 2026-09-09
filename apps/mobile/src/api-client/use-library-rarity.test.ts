import type { GameRarityDto, GameTallyDto } from "@steam/contracts";
import { err, ok, type Result } from "@steam/domain";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { ApiClient, ApiError } from "./api-client";
import { useLibraryRarity, type CountedLibrary } from "./use-library-rarity";
import type { TallyByAppId } from "../view-models/library";

type Rarity = Result<GameRarityDto, ApiError>;

/** A tally holding one unlock per name given, dated so the shape is real. */
const tally = (unlocks: readonly string[], total = 10): GameTallyDto => ({
  completion: {
    unlocked: unlocks.length,
    total,
    percentage: (unlocks.length / total) * 100,
  },
  unlocks: unlocks.map((apiName, index) => ({ apiName, at: 1_700_000 + index })),
});

const published = (appId: number): GameRarityDto => [
  { apiName: `ACH_${appId}`, rarity: appId / 10 },
];

/**
 * Eight games holding an unlock, so a load takes more than one wave — which is
 * where abandoning it, walking away from it and watching it land all happen.
 */
const HOLDS_UNLOCKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const HOLDS_NOTHING = 99;

const TALLIES: TallyByAppId = {
  ...Object.fromEntries(
    HOLDS_UNLOCKS.map((appId) => [appId, tally([`ACH_${appId}`])]),
  ),
  [HOLDS_NOTHING]: tally([]),
};

/** Only getGameRarity is exercised; anything else is a bug in the hook. */
const refuse = () => {
  throw new Error("the rarest tab should not have called this");
};

const clientAsking = (answer: (appId: number) => Promise<Rarity>): ApiClient => ({
  getProfile: refuse,
  getGames: refuse,
  getGameProgress: refuse,
  getGameTally: refuse,
  getGameRarity: answer,
  getAchievementNames: refuse,
});

/** Answers every game at once, and records what it was asked about. */
const eagerClient = () => {
  const asked: number[] = [];
  const client = clientAsking((appId) => {
    asked.push(appId);
    return Promise.resolve(ok(published(appId)));
  });
  return { client, asked };
};

/**
 * Answers every game except the ones named, which stay in flight until the
 * test releases them — the only way to look at a load while it is still on.
 */
const heldClient = (
  hold: readonly number[],
  answer: (appId: number) => Rarity = (appId) => ok(published(appId)),
) => {
  const gates: Array<() => void> = [];
  const asked: number[] = [];
  const client = clientAsking((appId) => {
    asked.push(appId);
    if (!hold.includes(appId)) {
      return Promise.resolve(answer(appId));
    }
    return new Promise<Rarity>((resolve) => {
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

const counted = (
  client: ApiClient,
  tallies: TallyByAppId = TALLIES,
): CountedLibrary => ({ client, tallies });

type Props = {
  readonly library: CountedLibrary | null;
  readonly active: boolean;
};

const renderRarity = (library: CountedLibrary | null, active = true) =>
  renderHook(({ library: l, active: a }: Props) => useLibraryRarity(l, a), {
    initialProps: { library, active },
  });

describe("useLibraryRarity", () => {
  /** A tab nobody has opened costs nothing: this is a secondary view. */
  it("asks nothing while the tab has not been opened", async () => {
    const { client, asked } = eagerClient();
    const { result } = renderRarity(counted(client), false);

    await waitFor(() => expect(result.current.status).toBe("idle"));

    expect(asked).toEqual([]);
    expect(result.current.rarity).toEqual({});
  });

  /**
   * Phase one needs to know which games hold an unlock, which is what the
   * completion waves deliver — and both loads share six connections, so
   * running them together would halve both.
   */
  it("asks nothing until the library has been counted", async () => {
    const { client, asked } = eagerClient();
    const { result } = renderRarity(null);

    await waitFor(() => expect(result.current.status).toBe("counting"));

    expect(asked).toEqual([]);
    expect(client).toBeDefined();
  });

  it("starts once a counted library arrives under an open tab", async () => {
    const { client, asked } = eagerClient();
    const { result, rerender } = renderRarity(null);
    expect(result.current.status).toBe("counting");

    rerender({ library: counted(client), active: true });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect([...asked].sort((a, b) => a - b)).toEqual([...HOLDS_UNLOCKS]);
  });

  /**
   * The rarest unlock hides statistically in a game the player barely touched,
   * so bounding by playtime destroys the answer the tab exists to give. What
   * bounds the load is holding an unlock at all, which is the only thing that
   * can be ranked.
   */
  it("asks about every game holding an unlock and about no other", async () => {
    const { client, asked } = eagerClient();
    const { result } = renderRarity(counted(client));

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect([...asked].sort((a, b) => a - b)).toEqual([...HOLDS_UNLOCKS]);
    expect(asked).not.toContain(HOLDS_NOTHING);
    expect(result.current.rarity[1]).toEqual(published(1));
  });

  /**
   * The tab draws a progress bar rather than a blank, so how far the load has
   * got has to be readable. Six of the eight make up the first wave.
   */
  it("reports how far the load has got while answers are landing", async () => {
    const { client, release } = heldClient([7]);
    const { result } = renderRarity(counted(client));

    await waitFor(() => expect(result.current.loaded).toBe(0.75));
    expect(result.current.status).toBe("loading");

    await release();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.loaded).toBeNull();
  });

  /** One unreachable game must not empty a whole ranking. */
  it("keeps what it could get when one game fails", async () => {
    const { client } = heldClient([], (appId) =>
      appId === 2 ? err<ApiError>("UNAVAILABLE") : ok(published(appId)),
    );
    const { result } = renderRarity(counted(client));

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.rarity[2]).toBeUndefined();
    expect(result.current.rarity[1]).toEqual(published(1));
  });

  /**
   * A game Steam publishes nothing about is a real answer, and it is kept as
   * one: an empty list says "asked, and there is nothing", where an absent one
   * says "not asked". The ranking excludes both, and only one of them is news.
   */
  it("keeps a game Steam publishes nothing about as an empty answer", async () => {
    const { client } = heldClient([], (appId) =>
      appId === 2 ? ok([]) : ok(published(appId)),
    );
    const { result } = renderRarity(counted(client));

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.rarity[2]).toEqual([]);
  });

  /** The answer is the session's, not the tab visit's. */
  it("does not ask again when the tab is left and opened once more", async () => {
    const { client, asked } = eagerClient();
    const library = counted(client);
    const { result, rerender } = renderRarity(library);
    await waitFor(() => expect(result.current.status).toBe("ready"));

    rerender({ library, active: false });
    rerender({ library, active: true });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(asked).toHaveLength(HOLDS_UNLOCKS.length);
    expect(result.current.rarity[1]).toEqual(published(1));
  });

  /**
   * A reader who walks away mid-load and comes back must not find a load
   * frozen where they left it, since nothing would ever restart it.
   */
  it("carries on loading after the reader has left the tab", async () => {
    const { client, release } = heldClient([7, 8]);
    const library = counted(client);
    const { result, rerender } = renderRarity(library);
    await waitFor(() => expect(result.current.loaded).toBe(0.75));

    rerender({ library, active: false });
    await release();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.rarity[8]).toEqual(published(8));
  });

  /**
   * Everything on this screen belongs to the profile it was fetched for. A
   * rarity held over would be crossed with the next player's unlocks.
   */
  it("throws the result away when another profile takes over", async () => {
    const previous = heldClient(HOLDS_UNLOCKS);
    const next = eagerClient();
    const { result, rerender } = renderRarity(counted(previous.client));
    await waitFor(() => expect(result.current.loaded).toBe(0));

    rerender({ library: null, active: true });
    expect(result.current.rarity).toEqual({});
    expect(result.current.status).toBe("counting");

    rerender({ library: counted(next.client, { 1: tally(["ACH_1"]) }), active: true });
    await previous.release();

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.rarity).toEqual({ 1: published(1) });
    // Not merely ignored on arrival: the waves behind the first are never
    // asked for, so an abandoned profile costs no further requests.
    expect(previous.asked).toHaveLength(6);
  });

  /**
   * Opening the tab is a request about the library in front of the reader, not
   * a standing order. A reader who looked at one player's rarest unlocks and
   * went back to Completion has not asked for the next player's whole library
   * to be fetched behind their back — which is the expensive direction to get
   * this wrong, one request per game holding an unlock.
   */
  it("does not fetch for a profile whose tab was never opened", async () => {
    const first = eagerClient();
    const next = eagerClient();
    const library = counted(first.client);
    const { result, rerender } = renderRarity(library);
    await waitFor(() => expect(result.current.status).toBe("ready"));

    // Back to Completion, and then another profile is chosen from there.
    rerender({ library, active: false });
    rerender({ library: null, active: false });
    const other = counted(next.client, { 1: tally(["ACH_1"]) });
    rerender({ library: other, active: false });

    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(next.asked).toEqual([]);
    expect(result.current.rarity).toEqual({});

    // Disarmed, not disabled: opening the tab on the new profile still loads.
    rerender({ library: other, active: true });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(next.asked).toEqual([1]);
  });

  it("has nothing to ask about in a library holding no unlock at all", async () => {
    const { result } = renderRarity(counted(clientAsking(refuse), {}));

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.rarity).toEqual({});
    expect(result.current.loaded).toBeNull();
  });
});
