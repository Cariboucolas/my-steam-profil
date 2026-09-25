import { describe, it, expect } from "vitest";

import { buildsOf, coveringBuild, settle, type Build } from "./builds";

const RUNTIME = "71b5ede68be929e6fa58ee3b0a11cdb080e25f3d";

const build = (status: Build["status"], overrides: Partial<Build> = {}): Build => ({
  id: `build-${status}`,
  status,
  runtimeVersion: RUNTIME,
  installUrl: "https://expo.dev/artifacts/eas/TRrF383a.apk",
  ...overrides,
});

describe("reading what eas build:list and eas build print", () => {
  // Trimmed from a real `eas build:list --json` entry: the runtime sits under
  // `runtime.version`, and the APK under `artifacts.buildUrl`.
  const printed = {
    id: "f5ed6a85-8e65-4f6c-bcc2-510df41c8ea6",
    status: "FINISHED",
    runtime: { id: "01a0b399", version: RUNTIME },
    artifacts: { buildUrl: "https://expo.dev/artifacts/eas/TRrF383a.apk" },
    gitCommitHash: "4efb0a633b548c584ea5e890df7d8b34fc16d7cc",
  };

  it("keeps the four fields the decision needs", () => {
    expect(buildsOf([printed])).toEqual([
      {
        id: "f5ed6a85-8e65-4f6c-bcc2-510df41c8ea6",
        status: "FINISHED",
        runtimeVersion: RUNTIME,
        installUrl: "https://expo.dev/artifacts/eas/TRrF383a.apk",
      },
    ]);
  });

  it("accepts a build still in the queue, which has no artefact yet", () => {
    const queued = { id: "q", status: "IN_QUEUE", runtime: { version: RUNTIME } };
    expect(buildsOf([queued])).toEqual([
      { id: "q", status: "IN_QUEUE", runtimeVersion: RUNTIME, installUrl: undefined },
    ]);
  });

  it("reads an empty list as no build at all", () => {
    expect(buildsOf([])).toEqual([]);
  });

  it("refuses anything that is not a list, rather than reading it as empty", () => {
    // An empty reading would start a twenty-minute build on a parsing mistake.
    expect(() => buildsOf({ error: "unauthorized" })).toThrow(/not a list/);
  });

  it("refuses a status it does not know, rather than guessing what it covers", () => {
    expect(() => buildsOf([{ ...printed, status: "LAUNCHING" }])).toThrow(/LAUNCHING/);
  });

  it("refuses an entry with no id", () => {
    expect(() => buildsOf([{ status: "FINISHED" }])).toThrow(/id/);
  });
});

describe("a runtime is covered by a build that exists or is on its way", () => {
  it.each(["NEW", "IN_QUEUE", "IN_PROGRESS", "FINISHED"] as const)(
    "counts a %s build",
    (status) => {
      expect(coveringBuild([build(status)])).toEqual(build(status));
    },
  );

  it.each(["ERRORED", "CANCELED", "PENDING_CANCEL"] as const)(
    "does not count a %s build, which will never be installed",
    (status) => {
      expect(coveringBuild([build(status)])).toBeUndefined();
    },
  );

  it("finds the one that counts among those that do not", () => {
    expect(coveringBuild([build("ERRORED"), build("IN_PROGRESS")])).toEqual(
      build("IN_PROGRESS"),
    );
  });

  it("finds nothing when there is nothing", () => {
    expect(coveringBuild([])).toBeUndefined();
  });
});

describe("a build this run started is only a success once it can be installed", () => {
  it("answers the install link of a finished build", () => {
    expect(settle([build("FINISHED")], RUNTIME)).toEqual({
      ok: true,
      installUrl: "https://expo.dev/artifacts/eas/TRrF383a.apk",
    });
  });

  it("fails a build that errored at Expo", () => {
    expect(settle([build("ERRORED")], RUNTIME)).toEqual({
      ok: false,
      reason: "The build ended ERRORED at Expo.",
    });
  });

  it("fails a build that was cancelled at Expo", () => {
    expect(settle([build("CANCELED")], RUNTIME)).toMatchObject({ ok: false });
  });

  it("fails a finished build that has no artefact to install", () => {
    expect(settle([build("FINISHED", { installUrl: undefined })], RUNTIME)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/no install link/),
    });
  });

  it("fails when the build carries another runtime than the one computed here", () => {
    // The whole detection rests on the two agreeing. If they ever part, every
    // merge would look uncovered and start a build: say so on the first one.
    expect(settle([build("FINISHED", { runtimeVersion: "f7b703d5" })], RUNTIME)).toEqual({
      ok: false,
      reason: `The build carries runtime f7b703d5, but this run computed ${RUNTIME}. Detection would start a build on every merge.`,
    });
  });

  it("fails when eas build answered something other than exactly one build", () => {
    expect(settle([], RUNTIME)).toMatchObject({ ok: false });
    expect(settle([build("FINISHED"), build("FINISHED")], RUNTIME)).toMatchObject({
      ok: false,
    });
  });
});
