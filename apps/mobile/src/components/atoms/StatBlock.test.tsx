import { render } from "@testing-library/react-native";

import { colors } from "../../theme/tokens";
import { StatBlock } from "./StatBlock";

describe("StatBlock", () => {
  it("shows its figure and what the figure counts", async () => {
    const { getByText } = await render(<StatBlock value="12" label="Perfect games" />);

    expect(getByText("12")).toBeTruthy();
    expect(getByText("Perfect games")).toBeTruthy();
  });

  it("accents the figure it is told to", async () => {
    const { getByText } = await render(<StatBlock value="37%" label="Completion" accent />);

    expect(getByText("37%").props.style.color).toBe(colors.accent);
  });

  it("leaves the other figures plain", async () => {
    const { getByText } = await render(<StatBlock value="3 128 h" label="Playtime" />);

    expect(getByText("3 128 h").props.style.color).toBe(colors.text);
  });
});
