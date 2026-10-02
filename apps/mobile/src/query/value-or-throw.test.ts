import { err, ok } from "@steam/domain";

import { ApiFailure, codeOf, valueOrThrow } from "./value-or-throw";

describe("valueOrThrow", () => {
  it("hands back the value of an answer that succeeded", () => {
    const games = [{ appId: 620 }];

    expect(valueOrThrow(ok(games))).toBe(games);
  });

  it("throws a failure carrying the code of an answer that failed", () => {
    const thrown = (() => {
      try {
        return valueOrThrow(err("PRIVATE_PROFILE" as const));
      } catch (failure) {
        return failure;
      }
    })();

    expect(thrown).toBeInstanceOf(ApiFailure);
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as ApiFailure).code).toBe("PRIVATE_PROFILE");
  });

  it("keeps the failure progress alone can meet", () => {
    expect(() => valueOrThrow(err("NOT_LOADED" as const))).toThrow(
      expect.objectContaining({ code: "NOT_LOADED" }),
    );
  });
});

describe("codeOf", () => {
  it("reads back the code a query failed with", () => {
    expect(codeOf(new ApiFailure("PRIVATE_PROFILE"))).toBe("PRIVATE_PROFILE");
  });

  /** The port never rejects (ADR-0002); a screen stuck on loading is no answer if it does. */
  it("says the backend could not be reached when something else was thrown", () => {
    expect(codeOf(new TypeError("undefined is not a function"))).toBe("UNAVAILABLE");
  });

  it("says the same of an answer about one game that was let through as a failure", () => {
    expect(codeOf(new ApiFailure("NOT_LOADED"))).toBe("UNAVAILABLE");
  });
});
