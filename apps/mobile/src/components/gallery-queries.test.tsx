import { composeStory } from "@storybook/react";
import { render, screen } from "@testing-library/react-native";

import preview from "../../.storybook/preview";
import { Probe } from "../query/probe.test-support";

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
