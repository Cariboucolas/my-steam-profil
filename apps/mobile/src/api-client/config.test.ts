import { resolveBaseUrl, resolveInitialSteamId } from "./config";

const STEAM_ID = "76561197979269357";

describe("resolveBaseUrl", () => {
  it("uses the address the build was given", () => {
    expect(resolveBaseUrl("https://api.example.com")).toBe("https://api.example.com");
  });

  it("falls back to a local backend, which is where it runs while developing", () => {
    expect(resolveBaseUrl(undefined)).toBe("http://localhost:3000");
  });

  it("treats an address that is only whitespace as none at all", () => {
    expect(resolveBaseUrl("   ")).toBe("http://localhost:3000");
  });

  it("trims an address that arrived with whitespace around it", () => {
    expect(resolveBaseUrl("  https://api.example.com  ")).toBe("https://api.example.com");
  });
});

describe("resolveInitialSteamId", () => {
  it("offers the steam id the build was given", () => {
    expect(resolveInitialSteamId(` ${STEAM_ID} `)).toBe(STEAM_ID);
  });

  it("offers nothing when the build was given none", () => {
    expect(resolveInitialSteamId(undefined)).toBeUndefined();
  });

  it("offers nothing when what it was given is not a steam id", () => {
    // The usual mistake is putting the backend URL in EXPO_PUBLIC_STEAM_ID.
    expect(resolveInitialSteamId("http://localhost:3000")).toBeUndefined();
  });
});
