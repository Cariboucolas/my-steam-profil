import { render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { Skeleton, SKELETON_TEST_ID } from "./Skeleton";

describe("Skeleton", () => {
  it("takes the width and height it is given", () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({
      width: 44,
      height: 9,
    });
  });

  /**
   * A skeleton stands where a value will be, so it has to read as absence
   * rather than as a value. It uses the same track colour an empty progress bar
   * does, which is the faintest surface in the palette.
   */
  it("is drawn in the faintest surface of the palette", () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    expect(getByTestId(SKELETON_TEST_ID)).toHaveStyle({
      backgroundColor: colors.track,
    });
  });

  it("tells a screen reader that something is loading", () => {
    const { getByTestId } = render(<Skeleton width={44} height={9} />);

    expect(getByTestId(SKELETON_TEST_ID).props.accessibilityLabel).toBe("Loading");
  });
});
