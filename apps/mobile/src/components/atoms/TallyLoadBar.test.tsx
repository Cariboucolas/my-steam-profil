import { render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import {
  TallyLoadBar,
  TALLY_LOAD_BAR_FILL_TEST_ID,
  TALLY_LOAD_BAR_TEST_ID,
} from "./TallyLoadBar";

describe("TallyLoadBar", () => {
  it("fills in proportion to the tallies that have landed", () => {
    const { getByTestId } = render(<TallyLoadBar loaded={0.37} />);

    expect(getByTestId(TALLY_LOAD_BAR_FILL_TEST_ID)).toHaveStyle({
      width: "37%",
      backgroundColor: colors.accent,
    });
  });

  it("is empty before anything has landed", () => {
    const { getByTestId } = render(<TallyLoadBar loaded={0} />);

    expect(getByTestId(TALLY_LOAD_BAR_FILL_TEST_ID)).toHaveStyle({ width: "0%" });
  });

  /**
   * Null is the hook's word for "nobody is waiting on anything" — before a
   * library has something to count, and once it all landed. A bar with nothing
   * to report is a bar that should not be there.
   */
  it("shows nothing when there is nothing to report", () => {
    const { queryByTestId } = render(<TallyLoadBar loaded={null} />);

    expect(queryByTestId(TALLY_LOAD_BAR_TEST_ID)).toBeNull();
  });

  /**
   * The card must not appear to change height when the bar goes. Layout is not
   * computed under jest, so this stands in for that: a bar taken out of the
   * flow cannot lend the card height, and cannot take any back either.
   */
  it("stays out of the flow it sits in", () => {
    const { getByTestId } = render(<TallyLoadBar loaded={0.5} />);

    expect(getByTestId(TALLY_LOAD_BAR_TEST_ID)).toHaveStyle({ position: "absolute" });
  });
});
