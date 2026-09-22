import { describe, it, expect, vi } from "vitest";

import { announceTo } from "./discord";
import { attemptWith, TIMEOUT_MS } from "./http";
import type { Target } from "./targets";

const target: Target = {
  name: "apps/api",
  url: "https://api.example.com/health",
  check: async (response) =>
    response.status === 200 ? ({ ok: true } as const) : ({ ok: false, reason: "checked" } as const),
};

describe("posting a line into the channel", () => {
  it("sends the one field Discord accepts", async () => {
    const send = vi.fn(async () => new Response(null, { status: 204 }));
    await announceTo("https://discord.example/hook", send)("🔴 down");

    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://discord.example/hook");
    expect(JSON.parse(String(init.body))).toEqual({ content: "🔴 down" });
  });

  it("fails the run when Discord refuses, rather than losing the alert quietly", async () => {
    const send = vi.fn(async () => new Response("nope", { status: 400 }));

    await expect(announceTo("https://discord.example/hook", send)("🔴 down")).rejects.toThrow(
      /400/,
    );
  });
});

describe("one attempt against one target", () => {
  it("hands the answer to the target's own check, and gives it a deadline", async () => {
    const send = vi.fn(async () => new Response("{}", { status: 500 }));

    await expect(attemptWith(send)(target)).resolves.toEqual({ ok: false, reason: "checked" });

    const [, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("calls a deadline a timeout, in the word the alert will print", async () => {
    const send = vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
    });

    await expect(attemptWith(send)(target)).resolves.toEqual({ ok: false, reason: "timeout" });
  });

  it("calls anything else unreachable, and says what it was", async () => {
    const send = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(attemptWith(send)(target)).resolves.toEqual({
      ok: false,
      reason: "unreachable (fetch failed)",
    });
  });

  it("waits ten seconds and no longer", () => {
    expect(TIMEOUT_MS).toBe(10_000);
  });
});
