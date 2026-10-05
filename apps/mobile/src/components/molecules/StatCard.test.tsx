import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("draws its heading, its content and its footer", () => {
    render(
      <StatCard
        eyebrow="YEARS"
        figure="3 912"
        subtitle="What each year brought."
        footer={<Text>records</Text>}
      >
        <Text>chart</Text>
      </StatCard>,
    );
    expect(screen.getByText("YEARS")).toBeTruthy();
    expect(screen.getByText("3 912")).toBeTruthy();
    expect(screen.getByText("chart")).toBeTruthy();
    expect(screen.getByText("records")).toBeTruthy();
  });

  it("says why it is empty instead of drawing content", () => {
    render(
      <StatCard
        eyebrow="YEARS"
        subtitle="What each year brought."
        empty="No dated unlocks"
        footer={<Text>records</Text>}
      >
        <Text>chart</Text>
      </StatCard>,
    );
    expect(screen.getByText("No dated unlocks")).toBeTruthy();
    expect(screen.queryByText("chart")).toBeNull();
    expect(screen.queryByText("records")).toBeNull();
  });
});
