import { describe, it, expect } from "vitest";

import { SteamGatewayError } from "../steam/steam-gateway";
import { describeFailure } from "./failure-log";

const SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";

const request = {
  method: "GET",
  url: "https://api.example.com/api/profile/76561197979269357/games?order=recent",
};

describe("describeFailure", () => {
  it("names the revision the Worker was deployed from", () => {
    expect(describeFailure(SHA, request, new Error("boom")).revision).toBe(SHA);
  });

  it("says dev where nothing deployed it, which is the only honest answer", () => {
    // ADR-0016, in the one place the API can say it: `wrangler dev` sets no
    // commit, and a log that invented one would be worse than a log with none.
    expect(describeFailure(undefined, request, new Error("boom")).revision).toBe("dev");
    expect(describeFailure("  ", request, new Error("boom")).revision).toBe("dev");
  });

  it("keeps the path that was asked for, and drops the host and the query", () => {
    // The path carries the SteamID, and that is deliberate: it is what makes a
    // failure reproducible, and Cloudflare has been recording it since the
    // first deploy anyway (ADR-0017). The query says nothing the path does not.
    expect(describeFailure(SHA, request, new Error("boom"))).toMatchObject({
      method: "GET",
      path: "/api/profile/76561197979269357/games",
    });
  });

  it("tells a Steam failure apart from one of ours", () => {
    expect(describeFailure(SHA, request, new SteamGatewayError("502 from Steam")).kind).toBe(
      "steam",
    );
    expect(describeFailure(SHA, request, new Error("boom")).kind).toBe("internal");
  });

  it("names the error and keeps what it said", () => {
    expect(describeFailure(SHA, request, new TypeError("x is not a function"))).toMatchObject({
      error: "TypeError",
      detail: "x is not a function",
    });
  });

  it("describes a throw that was never an Error", () => {
    // Nothing stops a dependency from throwing a string, and a log that
    // renders it as [object Object] is a log that cost someone an afternoon.
    expect(describeFailure(SHA, request, "just a string")).toMatchObject({
      error: "string",
      detail: "just a string",
      kind: "internal",
    });
  });
});
