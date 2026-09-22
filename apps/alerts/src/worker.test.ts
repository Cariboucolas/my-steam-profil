import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createFetchHandler } from "./worker";

const SECRET = "a-client-secret";
const BODY = '{"action":"triggered"}';
const SIGNATURE = "aa33363c5bd0fbb7ea36948b1b56cbc0aa412246b949e657291865c1fb514f06";
const WEBHOOK = "https://discord.com/api/webhooks/1/abc";

const env = { SENTRY_CLIENT_SECRET: SECRET, DISCORD_WEBHOOK_URL: WEBHOOK };

const alert = {
  action: "triggered",
  data: {
    triggered_rule: "New issue",
    event: {
      title: "ReferenceError: heck is not defined",
      environment: "web",
      release: "a16fff7d4e5f60718293a4b5c6d7e8f9012345678",
      web_url: "https://cdcraft.sentry.io/issues/1/events/2/",
    },
  },
};

/** Signs a body the way Sentry does, so a test can send something real. */
const signed = async (payload: unknown) => {
  const body = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const signature = [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return new Request("https://alerts.example.com/", {
    method: "POST",
    body,
    headers: { "sentry-hook-signature": signature, "sentry-hook-resource": "event_alert" },
  });
};

const accepted = async () => new Response(null, { status: 204 });

/**
 * A stand-in for fetch that says what Discord answered. Typed by its
 * parameters rather than inferred, so the assertions below can read the call.
 */
const discordAnswering = (answer: () => Promise<Response>) =>
  vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => answer());

let logged: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  logged.mockRestore();
});

describe("the alert bridge", () => {
  it("posts what Discord will accept when Sentry sends an alert", async () => {
    const post = discordAnswering(accepted);

    const response = await createFetchHandler(post)(await signed(alert), env);

    expect(response.status).toBe(204);
    expect(post).toHaveBeenCalledOnce();
    const [url, init] = post.mock.calls[0] ?? [];
    expect(url).toBe(WEBHOOK);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      embeds: [{ title: "ReferenceError: heck is not defined" }],
    });
  });

  it("refuses a request that is not signed by the integration", async () => {
    const post = discordAnswering(accepted);
    const forged = new Request("https://alerts.example.com/", {
      method: "POST",
      body: BODY,
      headers: { "sentry-hook-signature": SIGNATURE.replace("a", "b") },
    });

    const response = await createFetchHandler(post)(forged, env);

    expect(response.status).toBe(401);
    expect(post).not.toHaveBeenCalled();
  });

  it("answers nothing else than a POST", async () => {
    const post = discordAnswering(accepted);
    const get = new Request("https://alerts.example.com/", { method: "GET" });

    expect((await createFetchHandler(post)(get, env)).status).toBe(405);
    expect(post).not.toHaveBeenCalled();
  });

  it("stays quiet about what is not a failure", async () => {
    // Sentry posts installation and comment events to the same endpoint.
    const post = discordAnswering(accepted);

    const response = await createFetchHandler(post)(
      await signed({ action: "created", data: {} }),
      env,
    );

    expect(response.status).toBe(204);
    expect(post).not.toHaveBeenCalled();
  });

  it("answers 503 and says why when it was deployed without its two secrets", async () => {
    // Same shape as apps/api: a Worker has no terminal and no exit, so a
    // misconfiguration has to reach the log rather than a stack trace.
    const post = discordAnswering(accepted);

    const response = await createFetchHandler(post)(await signed(alert), {});

    expect(response.status).toBe(503);
    expect(post).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalled();
  });

  it("says loudly when Discord refused the message", async () => {
    // The one failure nothing downstream can catch: the alert was real, and
    // the person it was for will never know it existed.
    const post = discordAnswering(async () => new Response("bad request", { status: 400 }));

    const response = await createFetchHandler(post)(await signed(alert), env);

    expect(response.status).toBe(502);
    expect(logged).toHaveBeenCalled();
  });

  it("says loudly when Discord could not be reached at all", async () => {
    const post = discordAnswering(async () => {
      throw new Error("network down");
    });

    const response = await createFetchHandler(post)(await signed(alert), env);

    expect(response.status).toBe(502);
    expect(logged).toHaveBeenCalled();
  });
});
