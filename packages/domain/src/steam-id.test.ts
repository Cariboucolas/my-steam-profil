import { describe, it, expect } from "vitest";
import { SteamId } from "./steam-id";

describe("SteamId", () => {
  it("accepts a valid 17-digit SteamID64", () => {
    const result = SteamId.create("76561197979269357");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe("76561197979269357");
  });

  it("trims surrounding whitespace", () => {
    const result = SteamId.create("  76561197979269357  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe("76561197979269357");
  });

  it("rejects an empty string", () => {
    expect(SteamId.create("   ")).toEqual({ ok: false, error: "EMPTY" });
  });

  it("rejects an invalid format", () => {
    expect(SteamId.create("123").ok).toBe(false);
    expect(SteamId.create("abcdefghijklmnopq").ok).toBe(false);
    expect(SteamId.create("765611979792693570").ok).toBe(false); // 18 digits
  });

  it("compares by value (equals)", () => {
    const a = SteamId.create("76561197979269357");
    const b = SteamId.create("76561197979269357");
    expect(a.ok && b.ok && a.value.equals(b.value)).toBe(true);
  });
});
