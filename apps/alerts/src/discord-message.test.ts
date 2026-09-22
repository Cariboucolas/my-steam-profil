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

  it("refuses a comment, which shares an action name with a new issue", () => {
    // `comment.created` and `issue.created` both say "created". Routing on the
    // action alone would wake somebody for a comment.
    expect(describeAlert({ action: "created", data: { comment: { comment: "hi" } } })).toBeUndefined();
  });
});

/**
 * The other shape, and the one actually in use: Sentry's own Discord
 * integration needs a paid plan, so the free path is an issue webhook rather
 * than an alert rule action (ADR-0018).
 */
describe("describeAlert, on a new issue", () => {
  const issue = {
    action: "created",
    data: {
      issue: {
        title: "TypeError: x is not a function",
        culprit: "openExternalUrl(app/src/components)",
        level: "error",
        shortId: "STEAM-ACHIEVEMENTS-3",
        web_url: "https://cdcraft.sentry.io/issues/1234567890/",
      },
    },
  };

  it("leads with what broke, linked to the issue", () => {
    expect(embedOf(issue)).toMatchObject({
      title: "TypeError: x is not a function",
      url: "https://cdcraft.sentry.io/issues/1234567890/",
    });
  });

  it("names the issue by its short id, which is how a person refers to it", () => {
    expect(embedOf(issue)?.fields).toContainEqual(
      expect.objectContaining({ name: "Issue", value: "STEAM-ACHIEVEMENTS-3" }),
    );
  });

  it("says nothing about the revision, because an issue does not carry one", () => {
    // environment and release belong to an event. The link is what leads to
    // them; inventing a value here would be worse than leaving the field out.
    const names = embedOf(issue)?.fields.map((field) => field.name);

    expect(names).not.toContain("Revision");
    expect(names).not.toContain("Environment");
  });

  it("falls back to the permalink where web_url is absent", () => {
    const older = {
      action: "created",
      data: { issue: { title: "Boom", permalink: "https://cdcraft.sentry.io/issues/9/" } },
    };

    expect(embedOf(older)?.url).toBe("https://cdcraft.sentry.io/issues/9/");
  });

  it("wakes nobody for an issue that merely changed state", () => {
    // Subscribing to issues also subscribes to resolved, assigned, archived
    // and unresolved — including the ones you cause yourself while triaging.
    for (const action of ["resolved", "assigned", "archived", "unresolved"]) {
      expect(describeAlert({ ...issue, action })).toBeUndefined();
    }
  });
});
