import { init } from "@sentry/react-native";

import { startReporting } from "./start";

jest.mock("@sentry/react-native", () => ({ init: jest.fn() }));

const SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";

const live = {
  dsn: DSN,
  live: "true",
  sha: SHA,
  platform: "web",
  channel: undefined,
};

const optionsPassedToInit = () => (init as jest.Mock).mock.calls[0]?.[0];

beforeEach(() => {
  (init as jest.Mock).mockClear();
});

describe("startReporting", () => {
  it("starts reporting from a build the environment says is worth reporting from", () => {
    startReporting(live);

    expect(optionsPassedToInit()).toMatchObject({
      dsn: DSN,
      release: SHA,
      environment: "web",
    });
  });

  it("starts nothing at all from a build that is not the live site", () => {
    // Not merely a reporter that sends nothing: a development run never
    // reaches the network, so it can never file an issue someone has to read.
    startReporting({ ...live, live: undefined });

    expect(init).not.toHaveBeenCalled();
  });

  it("starts nothing when the destination was emptied", () => {
    startReporting({ ...live, dsn: "" });

    expect(init).not.toHaveBeenCalled();
  });

  it("adds nothing that identifies the reader rather than the request", () => {
    // ADR-0017. A default, once decided against, is worth a test: the SDK
    // owns this flag and could change its mind between two versions.
    startReporting(live);

    expect(optionsPassedToInit().sendDefaultPii).toBe(false);
  });

  it("keeps every error, because the volume that would justify sampling is not this one", () => {
    startReporting(live);

    expect(optionsPassedToInit().sampleRate).toBe(1);
  });

  it("measures no performance, which is a question this does not answer", () => {
    startReporting(live);

    expect(optionsPassedToInit().tracesSampleRate).toBe(0);
  });
});
