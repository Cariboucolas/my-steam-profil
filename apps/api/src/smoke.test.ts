import { SteamId } from "@steam/domain";
import { describe, expect, it } from "vitest";

describe("api toolchain", () => {
  it("can import from @steam/domain", () => {
    const result = SteamId.create("76561197979269357");
    expect(result.ok).toBe(true);
  });
});
