import { render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { PROGRESS_FILL_TEST_ID, ProgressBar } from "./ProgressBar";

const fillStyle = async (percentage: number | null) => {
  const { getByTestId } = await render(<ProgressBar percentage={percentage} />);
  return getByTestId(PROGRESS_FILL_TEST_ID).props.style as {
    width: string;
    backgroundColor: string;
  };
};

describe("ProgressBar", () => {
  it("fills the track to the given percentage", async () => {
    expect((await fillStyle(73)).width).toBe("73%");
  });

  it("turns green on a perfect game", async () => {
    expect((await fillStyle(100)).backgroundColor).toBe(colors.success);
  });

  it("stays amber below a perfect game", async () => {
    expect((await fillStyle(99)).backgroundColor).toBe(colors.accent);
  });

  it("shows an empty track when completion is unknown", async () => {
    expect((await fillStyle(null)).width).toBe("0%");
  });

  it("clamps a percentage that falls outside 0-100", async () => {
    expect((await fillStyle(140)).width).toBe("100%");
    expect((await fillStyle(-3)).width).toBe("0%");
  });
});
