import { render, screen } from "@testing-library/react-native";

import { FreshQueries } from "./FreshQueries";
import { Probe } from "./probe.test-support";
import { ApiFailure } from "./value-or-throw";

/** Well under the second the app waits before it asks again. */
const SOONER_THAN_THE_APP_RETRIES_MS = 500;

describe("FreshQueries", () => {
  it("serves a query to what it wraps", async () => {
    render(<Probe ask={() => Promise.resolve("answered")} />, { wrapper: FreshQueries });

    expect(await screen.findByText("answered")).toBeTruthy();
  });

  it("shares no answer between two renders", async () => {
    const ask = jest.fn(() => Promise.resolve("answered"));

    const first = render(<Probe ask={ask} />, { wrapper: FreshQueries });
    await screen.findByText("answered");
    first.unmount();

    render(<Probe ask={ask} />, { wrapper: FreshQueries });

    expect(screen.getByText("asking")).toBeTruthy();
    await screen.findByText("answered");
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("serves one cache for as long as it stays mounted", async () => {
    const ask = jest.fn(() => Promise.resolve("answered"));

    const { rerender } = render(<Probe ask={ask} />, { wrapper: FreshQueries });
    await screen.findByText("answered");
    rerender(<Probe ask={ask} />);

    expect(screen.getByText("answered")).toBeTruthy();
    expect(ask).toHaveBeenCalledTimes(1);
  });

  /** The app pauses before its one retry; a test or a story has no use for the pause. */
  it("asks an unavailable backend again without waiting", async () => {
    const ask = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new ApiFailure("UNAVAILABLE"))
      .mockResolvedValue("answered");

    render(<Probe ask={ask} />, { wrapper: FreshQueries });

    expect(
      await screen.findByText("answered", {}, { timeout: SOONER_THAN_THE_APP_RETRIES_MS }),
    ).toBeTruthy();
  });
});
