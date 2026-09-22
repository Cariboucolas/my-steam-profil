import { describe, it, expect } from "vitest";

import { isFromSentry } from "./signature";

const SECRET = "a-client-secret";
const BODY = '{"action":"triggered"}';

/** Computed independently, so this asserts the algorithm rather than restating it. */
const SIGNATURE = "aa33363c5bd0fbb7ea36948b1b56cbc0aa412246b949e657291865c1fb514f06";

describe("isFromSentry", () => {
  it("accepts a body signed with the integration's client secret", async () => {
    expect(await isFromSentry(SECRET, BODY, SIGNATURE)).toBe(true);
  });

  it("refuses a body that was changed after it was signed", async () => {
    expect(await isFromSentry(SECRET, `${BODY} `, SIGNATURE)).toBe(false);
  });

  it("refuses a signature made with another secret", async () => {
    expect(await isFromSentry("another-secret", BODY, SIGNATURE)).toBe(false);
  });

  it("refuses a request that carries no signature at all", async () => {
    // The endpoint is public by necessity — Sentry has to reach it — so an
    // unsigned request is the ordinary case for anyone who finds the address.
    expect(await isFromSentry(SECRET, BODY, undefined)).toBe(false);
    expect(await isFromSentry(SECRET, BODY, "")).toBe(false);
  });

  it("refuses a signature of the wrong length without reading further", async () => {
    expect(await isFromSentry(SECRET, BODY, SIGNATURE.slice(0, 10))).toBe(false);
  });

  it("is not fooled by case, since hex is compared as bytes", async () => {
    expect(await isFromSentry(SECRET, BODY, SIGNATURE.toUpperCase())).toBe(false);
  });
});
