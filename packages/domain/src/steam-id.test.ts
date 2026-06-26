import { describe, it, expect } from "vitest";
import { SteamId } from "./steam-id";

describe("SteamId", () => {
  it("accepte un SteamID64 valide (17 chiffres)", () => {
    const result = SteamId.create("76561197979269357");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe("76561197979269357");
  });

  it("retire les espaces autour", () => {
    const result = SteamId.create("  76561197979269357  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe("76561197979269357");
  });

  it("rejette une chaîne vide", () => {
    expect(SteamId.create("   ")).toEqual({ ok: false, error: "EMPTY" });
  });

  it("rejette un format invalide", () => {
    expect(SteamId.create("123").ok).toBe(false);
    expect(SteamId.create("abcdefghijklmnopq").ok).toBe(false);
    expect(SteamId.create("765611979792693570").ok).toBe(false); // 18 chiffres
  });

  it("compare par valeur (equals)", () => {
    const a = SteamId.create("76561197979269357");
    const b = SteamId.create("76561197979269357");
    expect(a.ok && b.ok && a.value.equals(b.value)).toBe(true);
  });
});
