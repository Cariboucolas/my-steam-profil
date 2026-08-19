import { describe, it, expect } from "vitest";
import { loadConfig, DEFAULT_PORT } from "./config";

const API_KEY = "SECRET";

describe("loadConfig", () => {
  it("refuses to start without a Steam API key", () => {
    expect(loadConfig({})).toEqual({ ok: false, error: "MISSING_API_KEY" });
  });

  it("treats a blank key as no key at all", () => {
    expect(loadConfig({ STEAM_API_KEY: "   " })).toEqual({
      ok: false,
      error: "MISSING_API_KEY",
    });
  });

  it("reads the key and falls back to a default port", () => {
    expect(loadConfig({ STEAM_API_KEY: API_KEY })).toEqual({
      ok: true,
      value: { steamApiKey: API_KEY, port: DEFAULT_PORT },
    });
  });

  it("reads a port from the environment", () => {
    expect(loadConfig({ STEAM_API_KEY: API_KEY, PORT: "8080" })).toEqual({
      ok: true,
      value: { steamApiKey: API_KEY, port: 8080 },
    });
  });

  it("refuses a port that is not a number rather than quietly using the default", () => {
    expect(loadConfig({ STEAM_API_KEY: API_KEY, PORT: "http" })).toEqual({
      ok: false,
      error: "INVALID_PORT",
    });
  });

  it("refuses a port outside the range a process can listen on", () => {
    expect(loadConfig({ STEAM_API_KEY: API_KEY, PORT: "70000" })).toEqual({
      ok: false,
      error: "INVALID_PORT",
    });
  });

  it("trims a key that arrived with whitespace around it", () => {
    const result = loadConfig({ STEAM_API_KEY: ` ${API_KEY} ` });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.steamApiKey).toBe(API_KEY);
  });
});
