import { describe, it, expect } from "vitest";

import { verdictOf, decide, type Incident } from "./decision";

const failed = (reason: string) => ({ ok: false, reason }) as const;
const passed = { ok: true } as const;

const incident: Incident = {
  number: 7,
  url: "https://github.com/o/r/issues/7",
  openedAt: new Date("2026-09-22T14:00:00Z"),
};

describe("three consecutive failures is a fact, fewer is a blip", () => {
  it("calls a target up when any attempt answered", () => {
    expect(verdictOf([failed("timeout"), passed])).toEqual({ up: true });
  });

  it("calls it down only when every attempt failed", () => {
    expect(verdictOf([failed("timeout"), failed("timeout"), failed("HTTP 503")])).toEqual({
      up: false,
      reason: "HTTP 503",
    });
  });

  it("reports the last reason, which is the one still true when it gave up", () => {
    expect(verdictOf([failed("HTTP 500"), failed("timeout")])).toEqual({
      up: false,
      reason: "timeout",
    });
  });
});

describe("one alert per outage, one announcement per recovery", () => {
  it("raises an incident the first time a target is found down", () => {
    expect(decide({ up: false, reason: "timeout" }, undefined)).toEqual({
      kind: "raise",
      reason: "timeout",
    });
  });

  it("says nothing while an incident is already open", () => {
    expect(decide({ up: false, reason: "timeout" }, incident)).toEqual({ kind: "nothing" });
  });

  it("resolves the incident when the target answers again", () => {
    expect(decide({ up: true }, incident)).toEqual({ kind: "resolve", incident });
  });

  it("says nothing at all on an ordinary healthy run", () => {
    expect(decide({ up: true }, undefined)).toEqual({ kind: "nothing" });
  });
});
