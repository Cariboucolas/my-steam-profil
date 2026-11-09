import { render } from "@testing-library/react-native";

import { RecountFailedBanner } from "./RecountFailedBanner";

describe("RecountFailedBanner", () => {
  it("says the Recount failed and that pulling again retries", () => {
    const { getByText } = render(<RecountFailedBanner failed />);

    expect(getByText("Couldn't recount — pull to try again")).toBeTruthy();
  });

  /** Gone after a successful Recount: the library shown is the latest then. */
  it("says nothing while the last Recount did not fail", () => {
    const { toJSON } = render(<RecountFailedBanner failed={false} />);

    expect(toJSON()).toBeNull();
  });
});
