import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { deviceAsksForLessMotion } from "../../accessibility/reduce-motion.test-support";
import { colors } from "../../theme/tokens";
import { TALLY_LOAD_BAR_TEST_ID } from "../atoms/TallyLoadBar";
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

  it("carries the library's load bar on its top edge while tallies land", () => {
    deviceAsksForLessMotion();
    const { rerender } = render(<StatCard eyebrow="YEARS" subtitle="s" loaded={0.5} />);
    expect(screen.getByTestId(TALLY_LOAD_BAR_TEST_ID)).toBeTruthy();

    rerender(<StatCard eyebrow="YEARS" subtitle="s" loaded={null} />);
    expect(screen.queryByTestId(TALLY_LOAD_BAR_TEST_ID)).toBeNull();
  });

  it("writes its figure in the colour of what it sums up, when told", () => {
    render(
      <StatCard eyebrow="YEARS" subtitle="s" figure="4 954" figureColor={colors.runningTotal} />,
    );
    expect(screen.getByText("4 954")).toHaveStyle({ color: colors.runningTotal });
  });
});
