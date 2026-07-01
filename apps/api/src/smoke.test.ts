import { describe, it, expect } from "vitest";
import { SteamId } from "@steam/domain";

describe("api toolchain", () => {
  it("can import from @steam/domain", () => {
    const result = SteamId.create("76561197979269357");
    expect(result.ok).toBe(true);
  });
});
