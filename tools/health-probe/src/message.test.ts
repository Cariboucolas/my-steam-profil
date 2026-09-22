import { describe, it, expect } from "vitest";

import { outageLine, recoveryLine, howLong } from "./message";

describe("the line that wakes somebody", () => {
  it("names the target, the reason and where the incident is", () => {
    expect(
      outageLine({
        target: "apps/api",
        reason: "HTTP 503",
        at: new Date("2026-09-22T14:22:07Z"),
        incidentUrl: "https://github.com/o/r/issues/7",
      }),
    ).toBe(
      "🔴 **apps/api** stopped answering — HTTP 503 — 14:22 UTC — https://github.com/o/r/issues/7",
    );
  });

  it("names the target and how long it was gone when it comes back", () => {
    expect(recoveryLine({ target: "apps/alerts", lasted: 47 * 60_000 })).toBe(
      "🟢 **apps/alerts** is answering again — down for 47 min",
    );
  });
});

describe("how long it was gone, said the way somebody would say it", () => {
  it("does not pretend to a precision the probe does not have", () => {
    expect(howLong(20_000)).toBe("less than a minute");
  });

  it("counts in minutes for under an hour", () => {
    expect(howLong(47 * 60_000)).toBe("47 min");
  });

  it("counts in hours and minutes beyond that", () => {
    expect(howLong(3 * 3_600_000 + 12 * 60_000)).toBe("3 h 12 min");
  });

  it("drops the minutes when there are none", () => {
    expect(howLong(2 * 3_600_000)).toBe("2 h");
  });
});
