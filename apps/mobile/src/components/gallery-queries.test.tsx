import { composeStory } from "@storybook/react";
import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import preview from "../../.storybook/preview";

/** Shows an answer kept for the session: a cache that held it would never ask again. */
function Probe({ ask }: { readonly ask: () => Promise<string> }) {
  const { data } = useQuery({ queryKey: ["probe"], queryFn: ask, staleTime: Infinity });

  return <Text>{data ?? "asking"}</Text>;
}

const storyAsking = (ask: () => Promise<string>) =>
  composeStory({ args: { ask } }, { component: Probe }, preview);

describe("the gallery's queries", () => {
  it("shares no answer between two stories", async () => {
    const ask = jest.fn(() => Promise.resolve("answered"));
    const One = storyAsking(ask);
    const Other = storyAsking(ask);

    const first = render(<One />);
    await screen.findByText("answered");
    first.unmount();

    render(<Other />);

    await screen.findByText("answered");
    expect(ask).toHaveBeenCalledTimes(2);
  });
});
