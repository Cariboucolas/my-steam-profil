import { createAppQueryClient, retriesOnceWhenUnavailable } from "./query-client";
import { ApiFailure } from "./value-or-throw";

describe("retriesOnceWhenUnavailable", () => {
  it("asks again once when the backend was unavailable", () => {
    expect(retriesOnceWhenUnavailable(0, new ApiFailure("UNAVAILABLE"))).toBe(true);
  });

  it("does not ask a third time", () => {
    expect(retriesOnceWhenUnavailable(1, new ApiFailure("UNAVAILABLE"))).toBe(false);
  });

  /** These would answer the same a second time (#162). */
  it.each(["NOT_FOUND", "PRIVATE_PROFILE", "INVALID_STEAM_ID", "NOT_LOADED"] as const)(
    "never asks again after %s",
    (code) => {
      expect(retriesOnceWhenUnavailable(0, new ApiFailure(code))).toBe(false);
    },
  );

  it("never asks again after something that is not an expected failure", () => {
    expect(retriesOnceWhenUnavailable(0, new TypeError("undefined is not a function"))).toBe(false);
  });
});

describe("createAppQueryClient", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** How many times a query asked before it gave up on a backend answering `code`. */
  const timesAsked = async (code: ApiFailure["code"]) => {
    const client = createAppQueryClient();
    const ask = jest.fn(() => Promise.reject(new ApiFailure(code)));

    const settled = client.fetchQuery({ queryKey: ["probe"], queryFn: ask }).catch(() => undefined);
    await jest.runAllTimersAsync();
    await settled;
    client.clear();

    return ask.mock.calls.length;
  };

  it("asks an unavailable backend a second time, and no more", async () => {
    expect(await timesAsked("UNAVAILABLE")).toBe(2);
  });

  it("asks once about a profile that is private", async () => {
    expect(await timesAsked("PRIVATE_PROFILE")).toBe(1);
  });

  /** A recount comes from the player or not at all (#162). */
  it("asks again for nothing the player did not ask for", () => {
    expect(createAppQueryClient().getDefaultOptions().queries).toMatchObject({
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retryOnMount: false,
    });
  });
});
