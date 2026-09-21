import { resolveReportingConfig } from "./config";

const SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";

const live = {
  dsn: DSN,
  live: "true",
  sha: SHA,
  platform: "web",
  channel: undefined,
};

describe("resolveReportingConfig", () => {
  it("reports from a live build that has a destination and names its commit", () => {
    expect(resolveReportingConfig(live)).toEqual({
      dsn: DSN,
      release: SHA,
      environment: "web",
    });
  });

  it("releases under the whole commit, which is what the source maps are uploaded against", () => {
    // Shortened is for reading (ADR-0016); a release is matched, not read.
    expect(resolveReportingConfig(live)?.release).toBe(SHA);
  });

  it("names the update channel as the environment where a build has one", () => {
    expect(resolveReportingConfig({ ...live, platform: "android", channel: "preview" })).toEqual({
      dsn: DSN,
      release: SHA,
      environment: "preview",
    });
  });

  it("falls back to the platform where no channel published this build", () => {
    expect(resolveReportingConfig({ ...live, platform: "web" })?.environment).toBe("web");
  });

  it("reports nothing when the destination was emptied, which is how reporting is turned off", () => {
    expect(resolveReportingConfig({ ...live, dsn: "" })).toBeUndefined();
  });

  it("reports nothing from a build that is not the live site", () => {
    expect(resolveReportingConfig({ ...live, live: undefined })).toBeUndefined();
  });

  it("does not read a flag that says false as a build saying it is live", () => {
    expect(resolveReportingConfig({ ...live, live: "false" })).toBeUndefined();
  });

  it("reports nothing it could not attribute to a commit", () => {
    // A report that cannot be pinned to a revision is an anecdote (ADR-0017).
    expect(resolveReportingConfig({ ...live, sha: undefined })).toBeUndefined();
  });

  it("treats values that are only whitespace as absent", () => {
    expect(resolveReportingConfig({ ...live, dsn: "   " })).toBeUndefined();
    expect(resolveReportingConfig({ ...live, live: "  " })).toBeUndefined();
    expect(resolveReportingConfig({ ...live, sha: "  " })).toBeUndefined();
  });

  it("trims what arrived with whitespace around it", () => {
    expect(resolveReportingConfig({ ...live, dsn: ` ${DSN} `, sha: ` ${SHA} ` })).toEqual({
      dsn: DSN,
      release: SHA,
      environment: "web",
    });
  });
});
