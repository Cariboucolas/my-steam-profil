import { describe, it, expect } from "vitest";

import { describeAlert } from "./discord-message";

const SHA = "a16fff7d4e5f60718293a4b5c6d7e8f9012345678";

const alert = {
  action: "triggered",
  data: {
    triggered_rule: "New issue",
    event: {
      title: "ReferenceError: heck is not defined",
      culprit: "?(<anonymous>)",
      level: "error",
      environment: "web",
      release: SHA,
      issue_id: "1117540176",
      web_url: "https://cdcraft.sentry.io/issues/1117540176/events/e4874d/",
    },
  },
};

const embedOf = (payload: unknown) => describeAlert(payload)?.embeds[0];

describe("describeAlert", () => {
  it("leads with what broke, linked to the event that says the rest", () => {
    expect(embedOf(alert)).toMatchObject({
      title: "ReferenceError: heck is not defined",
      url: "https://cdcraft.sentry.io/issues/1117540176/events/e4874d/",
    });
  });

  it("shortens the release the way everything else in this project shortens it", () => {
    // ADR-0016: seven characters is what the release tag and the update
    // message print, and what the app puts under its own header.
    expect(embedOf(alert)?.fields).toContainEqual(
      expect.objectContaining({ name: "Revision", value: "a16fff7" }),
    );
  });

  it("says which of the two published targets it came from", () => {
    expect(embedOf(alert)?.fields).toContainEqual(
      expect.objectContaining({ name: "Environment", value: "web" }),
    );
  });

  it("keeps the culprit, which is the one line worth reading before the link", () => {
    expect(embedOf(alert)?.description).toContain("?(<anonymous>)");
  });

  it("colours an error apart from a warning", () => {
    const warning = { ...alert, data: { ...alert.data, event: { ...alert.data.event, level: "warning" } } };

    expect(embedOf(alert)?.color).not.toBe(embedOf(warning)?.color);
  });

  it("says nothing about a field the payload did not carry", () => {
    const bare = {
      action: "triggered",
      data: { event: { title: "Something broke", web_url: "https://sentry.io/x" } },
    };

    expect(embedOf(bare)?.fields).toEqual([]);
    expect(embedOf(bare)?.title).toBe("Something broke");
  });

  it("refuses a payload that is not a triggered alert", () => {
    // Sentry posts installation and comment events to the same endpoint. They
    // are not failures and have no business waking anyone.
    expect(describeAlert({ action: "created", data: {} })).toBeUndefined();
    expect(describeAlert({ action: "triggered", data: {} })).toBeUndefined();
    expect(describeAlert("not an object")).toBeUndefined();
    expect(describeAlert(null)).toBeUndefined();
  });

  it("refuses an alert with nowhere to link to", () => {
    const noLink = { action: "triggered", data: { event: { title: "Something broke" } } };

    expect(describeAlert(noLink)).toBeUndefined();
  });

  it("truncates a title past what Discord accepts", () => {
    // Discord rejects the whole message over 256 characters, which would turn
    // a long error into no notification at all.
    const long = {
      ...alert,
      data: { ...alert.data, event: { ...alert.data.event, title: "x".repeat(400) } },
    };

    expect(embedOf(long)?.title).toHaveLength(256);
    expect(embedOf(long)?.title.endsWith("…")).toBe(true);
  });
});
