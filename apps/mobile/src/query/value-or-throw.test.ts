import { err, ok } from "@steam/domain";

import { ApiFailure, valueOrThrow } from "./value-or-throw";

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
