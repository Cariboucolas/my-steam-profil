import { createRequestQueue } from "./request-queue";

/**
 * The HTTP client never sends anything that rejects, so what the queue does
 * with a request that does is stated here: everything else about it is stated
 * through the client, where it matters.
 */
describe("createRequestQueue", () => {
  const never = () => new Promise<string>(() => undefined);

  it.each([
    ["rejects", () => Promise.reject(new Error("broken"))],
    [
      "throws on the way in",
      () => {
        throw new Error("broken");
      },
    ],
  ])("gives up the place of a request that %s, and says why", async (_how, broken) => {
    const queue = createRequestQueue(1);
    const next = jest.fn(never);

    const failed = queue(broken);
    void queue(next);

    await expect(failed).rejects.toThrow("broken");
    expect(next).toHaveBeenCalledTimes(1);
  });
});
