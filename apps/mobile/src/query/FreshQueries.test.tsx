import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { FreshQueries } from "./FreshQueries";

/** Shows an answer kept for the session: a cache that held it would never ask again. */
function Probe({ ask }: { readonly ask: () => Promise<string> }) {
  const { data } = useQuery({ queryKey: ["probe"], queryFn: ask, staleTime: Infinity });

  return <Text>{data ?? "asking"}</Text>;
}

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
});
