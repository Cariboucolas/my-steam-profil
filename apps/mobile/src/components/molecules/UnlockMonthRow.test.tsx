import { render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import type { UnlockMonth } from "../../view-models/unlock-calendar";
import { UnlockMonthRow, UNLOCK_DAY_TEST_ID } from "./UnlockMonthRow";

/**
 * A row as the builder hands it over: thirty-one columns, of which the first
 * `drawnDays` are days that exist, holding what `counts` says by day number.
 */
const month = (
  drawnDays: number,
  counts: Readonly<Record<number, number>> = {},
  current = false,
): UnlockMonth => ({
  label: "APR",
  current,
  days: Array.from({ length: 31 }, (_, index) =>
    index + 1 > drawnDays ? null : { count: counts[index + 1] ?? 0 },
  ),
});

describe("UnlockMonthRow", () => {
  it("draws only the days its month really holds", () => {
    const { getAllByTestId } = render(<UnlockMonthRow month={month(17)} />);

    expect(getAllByTestId(UNLOCK_DAY_TEST_ID)).toHaveLength(17);
  });

  it("marks a day that held unlocks and leaves the others empty", () => {
    const { getAllByTestId } = render(
      <UnlockMonthRow month={month(17, { 5: 3 })} />,
    );
    const days = getAllByTestId(UNLOCK_DAY_TEST_ID);

    expect(days[4]?.props.style.backgroundColor).toBe(colors.accent);
    expect(days[3]?.props.style.backgroundColor).toBe(colors.tileEmpty);
  });

  it("picks out the label of the month today falls in", () => {
    const { getByText } = render(
      <UnlockMonthRow month={month(17, {}, true)} />,
    );

    expect(getByText("APR").props.style.color).toBe(colors.accent);
  });

  it("leaves any other month's label quiet", () => {
    const { getByText } = render(<UnlockMonthRow month={month(30)} />);

    expect(getByText("APR").props.style.color).toBe(colors.textDim);
  });
});
