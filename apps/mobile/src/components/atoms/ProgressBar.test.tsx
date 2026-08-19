import { render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { ProgressBar, PROGRESS_FILL_TEST_ID } from "./ProgressBar";

const fillStyle = (percentage: number | null) => {
  const { getByTestId } = render(<ProgressBar percentage={percentage} />);
  return getByTestId(PROGRESS_FILL_TEST_ID).props.style as {
    width: string;
    backgroundColor: string;
  };
};

describe("ProgressBar", () => {
  it("fills the track to the given percentage", () => {
    expect(fillStyle(73).width).toBe("73%");
  });

  it("turns green on a perfect game", () => {
    expect(fillStyle(100).backgroundColor).toBe(colors.success);
  });

  it("stays amber below a perfect game", () => {
    expect(fillStyle(99).backgroundColor).toBe(colors.accent);
  });

  it("shows an empty track when completion is unknown", () => {
    expect(fillStyle(null).width).toBe("0%");
  });

  it("clamps a percentage that falls outside 0-100", () => {
    expect(fillStyle(140).width).toBe("100%");
    expect(fillStyle(-3).width).toBe("0%");
  });
});
