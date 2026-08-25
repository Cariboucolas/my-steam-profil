import { ok, err } from "@steam/domain";
import type { GameCompletionDto, GameDto } from "@steam/contracts";

import type { ApiClient } from "./api-client";
import type { CompletionByAppId } from "../view-models/library";
import {
  gamesWorthTallying,
  loadLibraryCompletions,
} from "./library-completions";

const game = (appId: number, lastPlayedAt: string | null): GameDto => ({
  appId,
  name: `Game ${appId}`,
  playtimeMinutes: 100,
  playtimeLabel: "1 h 40",
  iconUrl: `https://icon/${appId}.jpg`,
  lastPlayedAt,
});

const tally = (unlocked: number): GameCompletionDto => ({
  unlocked,
  total: 10,
  percentage: unlocked * 10,
});

const NEWEST = game(1, "2026-06-25T00:00:00.000Z");
const MIDDLE = game(2, "2026-03-01T00:00:00.000Z");
const OLDEST = game(3, "2020-01-01T00:00:00.000Z");
const NEVER_PLAYED = game(4, null);

const GAMES = [OLDEST, NEVER_PLAYED, NEWEST, MIDDLE] as const;

/** Only getGameCompletion is exercised; anything else is a bug in the loader. */
const refuse = () => {
  throw new Error("the loader should not have called this");
};

const clientAsking = (
  answer: (appId: number) => ReturnType<ApiClient["getGameCompletion"]>,
): ApiClient => ({
  getProfile: refuse,
  getGames: refuse,
  getGameProgress: refuse,
  getGameCompletion: answer,
});

/** Records what was asked, and answers every game the same way. */
const recordingClient = () => {
  const asked: number[] = [];
  const client = clientAsking((appId) => {
    asked.push(appId);
    return Promise.resolve(ok(tally(appId)));
  });
  return { client, asked };
};

const collect = () => {
  const waves: CompletionByAppId[] = [];
  const merged: Record<number, GameCompletionDto> = {};
  const onWave = (wave: CompletionByAppId) => {
    waves.push(wave);
    Object.assign(merged, wave);
  };
  return { waves, merged, onWave };
};

describe("gamesWorthTallying", () => {
  it("names every game the player has ever launched", () => {
    expect(gamesWorthTallying(GAMES)).toEqual(expect.arrayContaining([1, 2, 3]));
  });

  /**
   * A game that was never launched cannot have an unlock in it, so asking is a
   * request spent to be told zero. On the library measured, that is 100 of 367
   * games not asked about.
   */
  it("leaves out a game that was never launched", () => {
    expect(gamesWorthTallying(GAMES)).not.toContain(4);
  });

  it("asks about the most recently played first", () => {
    expect(gamesWorthTallying(GAMES)).toEqual([1, 2, 3]);
  });

  it("has nothing to name in an empty library", () => {
    expect(gamesWorthTallying([])).toEqual([]);
  });
});

describe("loadLibraryCompletions", () => {
  it("loads a tally for every game worth asking about", async () => {
    const { client, asked } = recordingClient();
    const { merged, onWave } = collect();

    await loadLibraryCompletions(client, [1, 2, 3], onWave);

    expect(asked.sort()).toEqual([1, 2, 3]);
    expect(merged).toEqual({ 1: tally(1), 2: tally(2), 3: tally(3) });
  });

  /**
   * The whole point of loading in waves: the list fills in as answers land,
   * rather than staying blank until the last of 267 comes back.
   */
  it("reports each wave as it lands, not everything at the end", async () => {
    const { client } = recordingClient();
    const { waves, onWave } = collect();

    await loadLibraryCompletions(client, [1, 2, 3, 4], onWave, { concurrency: 2 });

    expect(waves).toHaveLength(2);
    expect(waves[0]).toEqual({ 1: tally(1), 2: tally(2) });
  });

  it("never has more requests in flight than it was allowed", async () => {
    let inFlight = 0;
    let highWater = 0;
    const client = clientAsking(async (appId) => {
      inFlight += 1;
      highWater = Math.max(highWater, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return ok(tally(appId));
    });

    await loadLibraryCompletions(client, [1, 2, 3, 4, 5, 6, 7], collect().onWave, {
      concurrency: 3,
    });

    expect(highWater).toBeLessThanOrEqual(3);
  });

  /**
   * One private or unreachable game must not empty the list. The row keeps its
   * dash and everything else still arrives.
   */
  it("keeps what it could load when one game fails", async () => {
    const client = clientAsking((appId) =>
      Promise.resolve(appId === 2 ? err("UNAVAILABLE") : ok(tally(appId))),
    );
    const { merged, onWave } = collect();

    await loadLibraryCompletions(client, [1, 2, 3], onWave);

    expect(merged).toEqual({ 1: tally(1), 3: tally(3) });
  });

  /**
   * A player who switches profile, or leaves the screen, must not have the
   * previous library's remaining waves land on the new one.
   */
  it("stops between waves when it is told to", async () => {
    const { client, asked } = recordingClient();

    await loadLibraryCompletions(client, [1, 2, 3, 4, 5, 6], collect().onWave, {
      concurrency: 2,
      keepGoing: () => asked.length < 2,
    });

    expect(asked).toHaveLength(2);
  });

  it("reports nothing at all for an empty library", async () => {
    const { waves, onWave } = collect();

    await loadLibraryCompletions(clientAsking(refuse), [], onWave);

    expect(waves).toEqual([]);
  });
});
