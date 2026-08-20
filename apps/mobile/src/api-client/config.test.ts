import { resolveApiConfig } from "./config";

const STEAM_ID = "76561197979269357";

describe("resolveApiConfig", () => {
  it("reads both settings when they are given", () => {
    expect(
      resolveApiConfig("https://api.example.com", STEAM_ID),
    ).toEqual({
      ok: true,
      value: { baseUrl: "https://api.example.com", steamId: STEAM_ID },
    });
  });

  it("falls back to a local backend, which is where it runs while developing", () => {
    const result = resolveApiConfig(undefined, STEAM_ID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.baseUrl).toBe("http://localhost:3000");
  });

  it("says it is unconfigured when no steam id was supplied", () => {
    expect(resolveApiConfig(undefined, undefined)).toEqual({
      ok: false,
      error: "NOT_CONFIGURED",
    });
  });

  it("says it is unconfigured when the steam id is not one", () => {
    expect(resolveApiConfig(undefined, "my-steam-name")).toEqual({
      ok: false,
      error: "NOT_CONFIGURED",
    });
  });

  it("trims settings that arrived with whitespace around them", () => {
    const result = resolveApiConfig("  https://api.example.com  ", ` ${STEAM_ID} `);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.baseUrl).toBe("https://api.example.com");
      expect(result.value.steamId).toBe(STEAM_ID);
    }
  });
});
