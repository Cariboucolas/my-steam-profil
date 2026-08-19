import { describe, it, expect } from "vitest";
import { createApp } from "./app";
import { createSteamClient } from "../steam/steam-client";

const API_KEY = "TEST_KEY";

const unreachableSteam: typeof fetch = () => {
  throw new Error("this test should not have called Steam");
};

/**
 * Routes are exercised through a real Steam client whose fetch is stubbed, so
 * every test covers the whole chain down to the edge of the system.
 */
const appReaching = (fetchImpl: typeof fetch) =>
  createApp(createSteamClient({ apiKey: API_KEY, fetch: fetchImpl }));

describe("GET /health", () => {
  it("reports that the service is up", async () => {
    const response = await appReaching(unreachableSteam).request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("answers without asking Steam anything", async () => {
    // unreachableSteam throws if called, so reaching 200 is the assertion.
    expect((await appReaching(unreachableSteam).request("/health")).status).toBe(200);
  });
});

describe("an unknown route", () => {
  it("is a 404", async () => {
    const response = await appReaching(unreachableSteam).request("/nope");
    expect(response.status).toBe(404);
  });
});
