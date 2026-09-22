import { describe, it, expect } from "vitest";

import { saysItIsHealthy, refusesTheMethod } from "./checks";

const answering = (status: number, body: string): Response =>
  new Response(body, { status, headers: { "content-type": "application/json" } });

describe("what apps/api answering healthily looks like", () => {
  it("accepts the one body that means healthy", async () => {
    await expect(saysItIsHealthy(answering(200, '{"status":"ok"}'))).resolves.toEqual({
      ok: true,
    });
  });

  it("refuses a 503, whatever it says", async () => {
    await expect(saysItIsHealthy(answering(503, '{"error":"MISCONFIGURED"}'))).resolves.toEqual({
      ok: false,
      reason: "HTTP 503",
    });
  });

  it("refuses a 200 that does not say ok, which is how a misconfigured build is caught", async () => {
    await expect(saysItIsHealthy(answering(200, '{"status":"unhealthy"}'))).resolves.toEqual({
      ok: false,
      reason: "body was not {\"status\":\"ok\"}",
    });
  });

  it("refuses a 200 that is not JSON at all, rather than throwing", async () => {
    await expect(saysItIsHealthy(answering(200, "<html>nope</html>"))).resolves.toEqual({
      ok: false,
      reason: "body was not JSON",
    });
  });
});

describe("what apps/alerts being alive looks like", () => {
  it("reads the refusal of a GET as proof of life", async () => {
    await expect(refusesTheMethod(405)(new Response(null, { status: 405 }))).resolves.toEqual({
      ok: true,
    });
  });

  it("refuses anything else, so a GET route added later cannot pass for health", async () => {
    await expect(refusesTheMethod(405)(new Response("{}", { status: 200 }))).resolves.toEqual({
      ok: false,
      reason: "expected HTTP 405, got HTTP 200",
    });
  });
});
