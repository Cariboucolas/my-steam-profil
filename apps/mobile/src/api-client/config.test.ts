import { resolveBaseUrl, resolveInitialSteamId, resolveRevision } from "./config";

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

describe("resolveRevision", () => {
  const SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";

  it("names the commit a live deployment was built from, shortened as the release tag shortens it", () => {
    expect(resolveRevision(SHA, "true")).toBe("a1b2c3d");
  });

  it("marks a deployment that is not the live site, and still names its commit", () => {
    expect(resolveRevision(SHA, undefined)).toBe("dev a1b2c3d");
  });

  it("treats a live flag that is only whitespace as not set at all", () => {
    expect(resolveRevision(SHA, "  ")).toBe("dev a1b2c3d");
  });

  it("does not read a flag that says false as a build saying it is live", () => {
    // Read as the word rather than as any text: the one way to write the
    // claim down as false would otherwise be the loudest way to make it.
    expect(resolveRevision(SHA, "false")).toBe("dev a1b2c3d");
  });

  it("says dev alone where there is no commit to name", () => {
    expect(resolveRevision(undefined, "true")).toBe("dev");
  });

  it("treats a commit that is only whitespace as none at all", () => {
    expect(resolveRevision("   ", "true")).toBe("dev");
  });
});
