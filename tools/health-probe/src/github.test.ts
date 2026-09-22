import { describe, it, expect, vi } from "vitest";

import { incidentsOn } from "./github";
import type { Target } from "./targets";

const target: Target = {
  name: "apps/api",
  url: "https://api.example.com/health",
  check: async () => ({ ok: true }) as const,
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const sending = (...answers: readonly Response[]) => {
  const queue = [...answers];
  return vi.fn(async () => queue.shift() ?? json({}, 404));
};

const lastCall = (send: ReturnType<typeof sending>): [string, RequestInit] =>
  send.mock.calls.at(-1) as unknown as [string, RequestInit];

describe("the label the incidents are marked with", () => {
  it("confirms it exists, because a missing one fails at the worst moment", async () => {
    const send = sending(json({ name: "incident" }));

    await expect(incidentsOn("o/r", "t", send).labelExists()).resolves.toBe(true);
    expect(lastCall(send)[0]).toBe("https://api.github.com/repos/o/r/labels/incident");
  });

  it("reports its absence rather than creating it mid-incident", async () => {
    await expect(
      incidentsOn("o/r", "t", sending(json({}, 404))).labelExists(),
    ).resolves.toBe(false);
  });
});

describe("finding the incident already open for a target", () => {
  it("asks only for open issues carrying the label", async () => {
    const send = sending(json([]));
    await incidentsOn("o/r", "t", send).find(target);

    expect(lastCall(send)[0]).toBe(
      "https://api.github.com/repos/o/r/issues?state=open&labels=incident&per_page=100",
    );
  });

  it("recognises its own by title, and carries the moment it opened", async () => {
    const send = sending(
      json([
        { number: 3, title: "Health: apps/alerts is not answering", html_url: "x", created_at: "2026-09-22T10:00:00Z" },
        { number: 7, title: "Health: apps/api is not answering", html_url: "y", created_at: "2026-09-22T14:00:00Z" },
      ]),
    );

    await expect(incidentsOn("o/r", "t", send).find(target)).resolves.toEqual({
      number: 7,
      url: "y",
      openedAt: new Date("2026-09-22T14:00:00Z"),
    });
  });

  it("answers nothing when none of them is this target's", async () => {
    const send = sending(json([{ number: 3, title: "Something else", html_url: "x", created_at: "2026-09-22T10:00:00Z" }]));

    await expect(incidentsOn("o/r", "t", send).find(target)).resolves.toBeUndefined();
  });
});

describe("opening and closing an incident", () => {
  it("opens one titled after the target, labelled, and naming the reason", async () => {
    const send = sending(json({ number: 9, html_url: "z", created_at: "2026-09-22T14:47:00Z" }, 201));

    await expect(incidentsOn("o/r", "t", send).raise(target, "HTTP 503")).resolves.toEqual({
      number: 9,
      url: "z",
      openedAt: new Date("2026-09-22T14:47:00Z"),
    });

    const [url, init] = lastCall(send);
    expect(url).toBe("https://api.github.com/repos/o/r/issues");
    expect(init.method).toBe("POST");

    const sent = JSON.parse(String(init.body));
    expect(sent.title).toBe("Health: apps/api is not answering");
    expect(sent.labels).toEqual(["incident"]);
    expect(sent.body).toContain("HTTP 503");
    expect(sent.body).toContain("https://api.example.com/health");
  });

  it("closes it as completed, never reopening it for the next outage", async () => {
    const send = sending(json({}));
    await incidentsOn("o/r", "t", send).resolve({
      number: 7,
      url: "y",
      openedAt: new Date("2026-09-22T14:00:00Z"),
    });

    const [url, init] = lastCall(send);
    expect(url).toBe("https://api.github.com/repos/o/r/issues/7");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      state: "closed",
      state_reason: "completed",
    });
  });

  it("refuses to pretend a rejected write succeeded", async () => {
    const send = sending(json({ message: "Validation Failed" }, 422));

    await expect(incidentsOn("o/r", "t", send).raise(target, "timeout")).rejects.toThrow(
      /422/,
    );
  });
});
