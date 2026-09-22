import { describe, it, expect, vi } from "vitest";

import { watch, waitUntilHealthy, ATTEMPTS, type Ports } from "./run";
import type { Target } from "./targets";
import type { Incident } from "./decision";

const target: Target = {
  name: "apps/api",
  url: "https://api.example.com/health",
  check: async () => ({ ok: true }) as const,
};

const incident: Incident = {
  number: 7,
  url: "https://github.com/o/r/issues/7",
  openedAt: new Date("2026-09-22T14:00:00Z"),
};

const now = new Date("2026-09-22T14:47:00Z");

const ports = (overrides: Partial<Ports> = {}): Ports => ({
  attempt: vi.fn(async () => ({ ok: true }) as const),
  pause: vi.fn(async () => {}),
  findIncident: vi.fn(async () => undefined),
  raiseIncident: vi.fn(async () => incident),
  resolveIncident: vi.fn(async () => {}),
  announce: vi.fn(async () => {}),
  now: () => now,
  ...overrides,
});

const failing = (reason: string) => vi.fn(async () => ({ ok: false, reason }) as const);

describe("a scheduled run", () => {
  it("stops at the first answer, because one answer is not three failures", async () => {
    const it_ = ports();
    await watch(it_)(target);

    expect(it_.attempt).toHaveBeenCalledTimes(1);
    expect(it_.pause).not.toHaveBeenCalled();
  });

  it("spaces its attempts, and does not wait after the last one", async () => {
    const it_ = ports({ attempt: failing("timeout") });
    await watch(it_)(target);

    expect(it_.attempt).toHaveBeenCalledTimes(ATTEMPTS);
    expect(it_.pause).toHaveBeenCalledTimes(ATTEMPTS - 1);
  });

  it("opens an incident and says so, the first time a target is found down", async () => {
    const it_ = ports({ attempt: failing("HTTP 503") });
    await watch(it_)(target);

    expect(it_.raiseIncident).toHaveBeenCalledWith(target, "HTTP 503");
    expect(it_.announce).toHaveBeenCalledWith(
      "🔴 **apps/api** stopped answering — HTTP 503 — 14:47 UTC — https://github.com/o/r/issues/7",
    );
  });

  it("stays quiet while the incident it already opened is still open", async () => {
    const it_ = ports({
      attempt: failing("timeout"),
      findIncident: vi.fn(async () => incident),
    });
    await watch(it_)(target);

    expect(it_.raiseIncident).not.toHaveBeenCalled();
    expect(it_.announce).not.toHaveBeenCalled();
  });

  it("closes the incident and says how long it lasted, when the target answers again", async () => {
    const it_ = ports({ findIncident: vi.fn(async () => incident) });
    await watch(it_)(target);

    expect(it_.resolveIncident).toHaveBeenCalledWith(incident, target);
    expect(it_.announce).toHaveBeenCalledWith(
      "🟢 **apps/api** is answering again — down for 47 min",
    );
  });

  it("says nothing whatsoever on an ordinary healthy run", async () => {
    const it_ = ports();
    await watch(it_)(target);

    expect(it_.announce).not.toHaveBeenCalled();
    expect(it_.raiseIncident).not.toHaveBeenCalled();
    expect(it_.resolveIncident).not.toHaveBeenCalled();
  });

  it("answers whether the target was up, so the caller can set an exit code", async () => {
    await expect(watch(ports())(target)).resolves.toEqual({ up: true });
  });
});

describe("the probe that runs right after a deploy", () => {
  it("returns as soon as the fresh Worker answers, rather than waiting out the window", async () => {
    let calls = 0;
    const attempt = vi.fn(async () =>
      ++calls === 1 ? ({ ok: false, reason: "HTTP 503" } as const) : ({ ok: true } as const),
    );
    const it_ = ports({ attempt });

    await expect(waitUntilHealthy(it_, 60_000)(target)).resolves.toEqual({ ok: true });
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("gives up with the last reason once the window has passed", async () => {
    const clock = [0, 30_000, 61_000].values();
    const it_ = ports({
      attempt: failing("timeout"),
      now: () => new Date(clock.next().value ?? 99_000),
    });

    await expect(waitUntilHealthy(it_, 60_000)(target)).resolves.toEqual({
      ok: false,
      reason: "timeout",
    });
  });

  it("raises nothing and announces nothing: a red workflow is the notification", async () => {
    const it_ = ports({ attempt: failing("timeout"), now: () => new Date(99_000) });
    await waitUntilHealthy(it_, 0)(target);

    expect(it_.raiseIncident).not.toHaveBeenCalled();
    expect(it_.announce).not.toHaveBeenCalled();
    expect(it_.findIncident).not.toHaveBeenCalled();
  });
});
